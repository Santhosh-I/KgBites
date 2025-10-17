"""
Payment Views Module
Comprehensive API views for payment system operations.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, generics, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from kgbytes_source.pagination import StandardPagination
from .models import PaymentMethod, Wallet, Transaction, PaymentRequest
from .serializers import (
    PaymentMethodSerializer, WalletSerializer, TransactionSerializer,
    PaymentRequestSerializer, WalletTopUpSerializer, TransactionCreateSerializer,
    WalletBalanceSerializer, PaymentSummarySerializer, RefundRequestSerializer
)


class TransactionPagination(PageNumberPagination):
    """Custom pagination for transactions"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ========== PAYMENT METHOD VIEWS ==========

class PaymentMethodListView(generics.ListAPIView):
    """List all available payment methods"""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(
            is_enabled=True, 
            status='active'
        ).order_by('name')


# ========== WALLET VIEWS ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet_info(request):
    """Get current user's wallet information"""
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        # Calculate daily and monthly spending
        today = timezone.now().date()
        current_month = timezone.now().replace(day=1).date()
        
        daily_spent = wallet.transactions.filter(
            transaction_type='debit',
            status='completed',
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        monthly_spent = wallet.transactions.filter(
            transaction_type='debit',
            status='completed',
            created_at__date__gte=current_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Prepare wallet data
        wallet_data = {
            'balance': wallet.balance,
            'status': wallet.status,
            'daily_spent': daily_spent,
            'daily_limit': wallet.daily_spend_limit,
            'monthly_spent': monthly_spent,
            'monthly_limit': wallet.monthly_spend_limit,
            'can_transact': wallet.status == 'active',
        }
        
        serializer = WalletBalanceSerializer(wallet_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch wallet information',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_topup_request(request):
    """Create a wallet top-up request"""
    # Log the incoming request data for debugging
    print(f"Top-up request data: {request.data}")
    
    serializer = WalletTopUpSerializer(data=request.data)
    
    if not serializer.is_valid():
        print(f"Serializer validation failed: {serializer.errors}")
        return Response({
            'error': 'Invalid top-up request',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        amount = serializer.validated_data['amount']
        payment_method_id = serializer.validated_data['payment_method_id']
        
        payment_method = get_object_or_404(PaymentMethod, id=payment_method_id)
        
        # Validate amount against payment method limits
        if amount < payment_method.min_amount:
            return Response({
                'error': f'Minimum amount for {payment_method.name} is ₹{payment_method.min_amount}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if amount > payment_method.max_amount:
            return Response({
                'error': f'Maximum amount for {payment_method.name} is ₹{payment_method.max_amount}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate fees
        fee_amount = payment_method.calculate_fee(amount)
        total_amount = amount + fee_amount
        
        # Create payment request
        payment_request = PaymentRequest.objects.create(
            user=request.user,
            payment_method=payment_method,
            amount=amount,
            fee_amount=fee_amount,
            total_amount=total_amount,
            purpose='Wallet Top-up',
            description=f'Top-up wallet with ₹{amount} via {payment_method.name}',
            expires_at=timezone.now() + timedelta(hours=1)  # 1 hour expiry
        )
        
        # For wallet payment method, process immediately
        if payment_method.payment_type == 'wallet':
            return Response({
                'error': 'Cannot top-up wallet using wallet payment method'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For demo purposes, we'll simulate other payment methods
        # In production, integrate with actual payment gateways
        
        response_data = PaymentRequestSerializer(payment_request).data
        response_data['payment_url'] = f'/payments/gateway/{payment_request.request_id}/'
        
        return Response({
            'message': 'Top-up request created successfully',
            'payment_request': response_data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': 'Failed to create top-up request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def simulate_payment_success(request, request_id):
    """Simulate payment gateway success (for demo/testing)"""
    try:
        payment_request = get_object_or_404(
            PaymentRequest, 
            request_id=request_id,
            user=request.user,
            status__in=['initiated', 'pending']
        )
        
        if payment_request.is_expired():
            payment_request.status = 'expired'
            payment_request.save()
            return Response({
                'error': 'Payment request has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create wallet
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        with db_transaction.atomic():
            # Credit wallet
            transaction_obj = wallet.credit(
                amount=payment_request.amount,
                description=f'Wallet top-up via {payment_request.payment_method.name}',
                reference=str(payment_request.request_id),
                payment_method=payment_request.payment_method
            )
            
            # Mark payment request as completed
            payment_request.mark_completed({
                'gateway': 'demo',
                'transaction_id': str(transaction_obj.transaction_id),
                'status': 'success'
            })
            
            # Link transaction to payment request
            payment_request.transaction = transaction_obj
            payment_request.save()
        
        return Response({
            'message': 'Payment processed successfully',
            'wallet_balance': wallet.balance,
            'transaction_id': transaction_obj.transaction_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to process payment',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== TRANSACTION VIEWS ==========

class TransactionListView(generics.ListAPIView):
    """List user's transactions with filtering and pagination"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TransactionPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        wallet = get_object_or_404(Wallet, user=self.request.user)
        queryset = wallet.transactions.select_related('payment_method', 'order')
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_summary(request):
    """Get payment dashboard summary"""
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        # Calculate statistics
        today = timezone.now().date()
        current_month = timezone.now().replace(day=1).date()
        
        total_transactions = wallet.transactions.filter(status='completed').count()
        
        spent_today = wallet.transactions.filter(
            transaction_type='debit',
            status='completed',
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        spent_month = wallet.transactions.filter(
            transaction_type='debit',
            status='completed',
            created_at__date__gte=current_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Recent transactions
        recent_transactions = wallet.transactions.select_related(
            'payment_method', 'order'
        ).order_by('-created_at')[:10]
        
        # Available payment methods
        payment_methods = PaymentMethod.objects.filter(
            is_enabled=True,
            status='active'
        )
        
        summary_data = {
            'total_balance': wallet.balance,
            'total_transactions': total_transactions,
            'total_spent_today': spent_today,
            'total_spent_month': spent_month,
            'recent_transactions': recent_transactions,
            'available_payment_methods': payment_methods,
        }
        
        serializer = PaymentSummarySerializer(summary_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch payment summary',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== PAYMENT PROCESSING FOR ORDERS ==========

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_order_payment(request, order_id):
    """Process payment for an order"""
    from orders.models import Order  # Import here to avoid circular imports
    
    try:
        order = get_object_or_404(Order, id=order_id, student__user=request.user)
        
        if order.payment_status == 'paid':
            return Response({
                'error': 'Order is already paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get wallet
        wallet = get_object_or_404(Wallet, user=request.user)
        
        # Check if wallet can be debited
        can_debit, reason = wallet.can_debit(order.total_amount)
        if not can_debit:
            return Response({
                'error': f'Payment failed: {reason}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with db_transaction.atomic():
            # Debit from wallet
            transaction_obj = wallet.debit(
                amount=order.total_amount,
                description=f'Order payment - {order.order_code}',
                reference=order.order_code
            )
            
            # Link transaction to order
            transaction_obj.order = order
            transaction_obj.save()
            
            # Update order payment status
            order.payment_status = 'paid'
            order.payment_method = 'wallet'
            order.save(update_fields=['payment_status', 'payment_method'])
        
        return Response({
            'message': 'Payment processed successfully',
            'transaction_id': transaction_obj.transaction_id,
            'wallet_balance': wallet.balance,
            'order_status': order.status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to process payment',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== REFUND PROCESSING ==========

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_refund(request):
    """Request refund for a transaction"""
    serializer = RefundRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid refund request',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        transaction_id = serializer.validated_data['transaction_id']
        reason = serializer.validated_data['reason']
        refund_amount = serializer.validated_data.get('amount')
        
        # Get original transaction
        original_transaction = get_object_or_404(
            Transaction,
            transaction_id=transaction_id,
            wallet__user=request.user
        )
        
        if refund_amount and refund_amount > original_transaction.amount:
            return Response({
                'error': 'Refund amount cannot be greater than original transaction amount'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        refund_amount = refund_amount or original_transaction.amount
        
        with db_transaction.atomic():
            # Create refund transaction
            wallet = original_transaction.wallet
            refund_transaction = wallet.credit(
                amount=refund_amount,
                description=f'Refund for transaction {transaction_id}: {reason}',
                reference=f'REFUND-{transaction_id}'
            )
            
            # Set transaction type as refund
            refund_transaction.transaction_type = 'refund'
            refund_transaction.refund_for = original_transaction
            refund_transaction.save()
        
        return Response({
            'message': 'Refund processed successfully',
            'refund_transaction_id': refund_transaction.transaction_id,
            'refund_amount': refund_amount,
            'wallet_balance': wallet.balance
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to process refund',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== STAFF VIEWS ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_payment_stats(request):
    """Get payment statistics for staff dashboard"""
    try:
        # Check if user is staff
        if not request.user.is_staff:
            return Response({
                'error': 'Access denied. Staff privileges required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Initialize default values
        total_transactions_today = 0
        total_amount_today = Decimal('0')
        active_wallets = 0
        average_transaction_amount = Decimal('0')
        success_rate = 100.0
        pending_requests = 0
        
        # Get today's date range
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        
        # Calculate today's statistics safely
        today_transactions = Transaction.objects.filter(
            created_at__gte=today_start,
            status='completed'
        )
        
        total_transactions_today = today_transactions.count()
        if total_transactions_today > 0:
            amount_sum = today_transactions.aggregate(total=Sum('amount'))['total']
            total_amount_today = amount_sum or Decimal('0')
        
        # Active wallets (wallets with transactions in last 30 days)
        try:
            thirty_days_ago = timezone.now() - timedelta(days=30)
            active_wallets = Wallet.objects.filter(
                transactions__created_at__gte=thirty_days_ago
            ).distinct().count()
        except Exception as e:
            # Fallback: count all wallets if relation query fails
            active_wallets = Wallet.objects.count()
        
        # Average transaction amount (last 100 completed transactions)
        try:
            recent_transactions = Transaction.objects.filter(
                status='completed'
            ).order_by('-created_at')[:100]
            
            if recent_transactions:
                # Convert queryset to list to avoid repeated DB hits
                recent_list = list(recent_transactions)
                if recent_list:
                    avg_result = Transaction.objects.filter(
                        id__in=[t.id for t in recent_list]
                    ).aggregate(avg=Avg('amount'))
                    average_transaction_amount = avg_result['avg'] or Decimal('0')
        except Exception:
            average_transaction_amount = Decimal('0')
        
        # Success rate (last 500 transactions)
        try:
            last_500 = list(Transaction.objects.order_by('-created_at')[:500])
            if last_500:
                success_count = sum(1 for t in last_500 if t.status == 'completed')
                success_rate = (success_count / len(last_500) * 100) if len(last_500) > 0 else 100.0
        except Exception:
            success_rate = 100.0
        
        # Pending top-up requests
        try:
            pending_requests = PaymentRequest.objects.filter(
                status__in=['pending', 'processing']
            ).count()
        except Exception:
            pending_requests = 0
        
        return Response({
            'totalTransactionsToday': total_transactions_today,
            'totalAmountToday': float(total_amount_today),
            'totalWalletsActive': active_wallets,
            'averageTransactionAmount': float(average_transaction_amount),
            'successRate': round(success_rate, 2),
            'topUpRequestsPending': pending_requests
        })
        
    except Exception as e:
        # More detailed error logging for debugging
        import traceback
        print(f"Staff payment stats error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        
        return Response({
            'error': 'Failed to fetch payment statistics',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_transactions(request):
    """Get all transactions for staff monitoring with filters"""
    try:
        # Check if user is staff
        if not request.user.is_staff:
            return Response({
                'error': 'Access denied. Staff privileges required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get filter parameters
        transaction_type = request.GET.get('transaction_type', 'all')
        status_filter = request.GET.get('status', 'all')
        search = request.GET.get('search', '')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        
        # Build queryset
        queryset = Transaction.objects.select_related('wallet__user').order_by('-created_at')
        
        # Apply filters
        if transaction_type != 'all':
            queryset = queryset.filter(transaction_type=transaction_type)
        
        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        if search:
            queryset = queryset.filter(
                Q(transaction_id__icontains=search) |
                Q(wallet__user__username__icontains=search) |
                Q(wallet__user__first_name__icontains=search) |
                Q(wallet__user__last_name__icontains=search) |
                Q(description__icontains=search)
            )
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        # Pagination
        paginator = TransactionPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        # Serialize data
        transactions_data = []
        for transaction in page:
            user_name = f"{transaction.wallet.user.first_name} {transaction.wallet.user.last_name}".strip()
            if not user_name:
                user_name = transaction.wallet.user.username
            
            transactions_data.append({
                'id': transaction.id,
                'transaction_id': transaction.transaction_id,
                'user_name': user_name,
                'transaction_type': transaction.transaction_type,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'status': transaction.status,
                'created_at': transaction.created_at.isoformat(),
                'payment_method': transaction.payment_method or 'wallet'
            })
        
        return paginator.get_paginated_response(transactions_data)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch transactions',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_payment_requests(request):
    """Get pending payment requests for staff review"""
    try:
        # Check if user is staff
        if not request.user.is_staff:
            return Response({
                'error': 'Access denied. Staff privileges required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get pending and processing requests
        requests = PaymentRequest.objects.filter(
            status__in=['pending', 'processing']
        ).select_related('user').order_by('-created_at')
        
        requests_data = []
        for payment_request in requests:
            user_name = f"{payment_request.user.first_name} {payment_request.user.last_name}".strip()
            if not user_name:
                user_name = payment_request.user.username
            
            requests_data.append({
                'id': payment_request.id,
                'request_id': payment_request.request_id,
                'user_name': user_name,
                'amount': float(payment_request.amount),
                'payment_method': payment_request.payment_method,
                'status': payment_request.status,
                'created_at': payment_request.created_at.isoformat()
            })
        
        return Response(requests_data)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch payment requests',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_process_refund(request):
    """Process refund request by staff"""
    try:
        # Check if user is staff
        if not request.user.is_staff:
            return Response({
                'error': 'Access denied. Staff privileges required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        transaction_id = request.data.get('transaction_id')
        reason = request.data.get('reason', 'Staff processed refund')
        
        if not transaction_id:
            return Response({
                'error': 'Transaction ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the original transaction
        try:
            original_transaction = Transaction.objects.get(
                transaction_id=transaction_id,
                transaction_type__in=['debit', 'payment'],
                status='completed'
            )
        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found or cannot be refunded'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already refunded
        existing_refund = Transaction.objects.filter(
            refund_for=original_transaction
        ).first()
        
        if existing_refund:
            return Response({
                'error': 'Transaction has already been refunded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with db_transaction.atomic():
            # Create refund transaction
            wallet = original_transaction.wallet
            refund_transaction = wallet.credit(
                amount=original_transaction.amount,
                description=f'Staff refund: {reason}',
                reference=f'STAFF-REFUND-{transaction_id}'
            )
            
            # Set transaction type as refund
            refund_transaction.transaction_type = 'refund'
            refund_transaction.refund_for = original_transaction
            refund_transaction.save()
        
        return Response({
            'message': 'Refund processed successfully',
            'refund_transaction_id': refund_transaction.transaction_id,
            'refund_amount': float(refund_transaction.amount),
            'wallet_balance': float(wallet.balance)
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to process refund',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
