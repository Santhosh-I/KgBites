from rest_framework import status, viewsets, filters, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Order, OrderItem, OrderOTP
from .serializers import OrderSerializer, OrderCreateSerializer, OrderOTPSerializer, CreateOrderOTPSerializer
from accounts.models import CanteenStaff
from kgbytes_source.pagination import StandardPagination, LargePagination

# Map CanteenStaff.counter TextChoices to menu.Counter IDs
# This is needed because CanteenStaff.counter is a CharField, not a ForeignKey
COUNTER_CHOICE_TO_ID = {
    'VEG_MEALS': 1,         # Veg & Meals Counter
    'BIRIYANI_CHINESE': 2,  # Biryani & Chinese Counter
    'SNACKS': 3,            # Snacks Counter
}


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__user__username', 'student__user__email', 'id']
    ordering_fields = ['created_at', 'total_amount', 'status', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Optimized queryset with select_related and prefetch_related"""
        queryset = Order.objects.select_related(
            'student__user'
        ).prefetch_related(
            'items__food_item__counter'
        )
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        date_filter = self.request.query_params.get('date')
        if date_filter:
            today = timezone.now().date()
            if date_filter == 'today':
                queryset = queryset.filter(created_at__date=today)
            elif date_filter == 'yesterday':
                yesterday = today - timedelta(days=1)
                queryset = queryset.filter(created_at__date=yesterday)
            elif date_filter == 'week':
                week_ago = today - timedelta(days=7)
                queryset = queryset.filter(created_at__date__gte=week_ago)
            elif date_filter == 'month':
                month_ago = today - timedelta(days=30)
                queryset = queryset.filter(created_at__date__gte=month_ago)
        
        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        if min_amount:
            queryset = queryset.filter(total_amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(total_amount__lte=max_amount)
        
        return queryset
    
    def partial_update(self, request, *args, **kwargs):
        """Update order status"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status and new_status in dict(Order.STATUS_CHOICES):
            order.status = new_status
            if new_status == 'completed':
                order.mark_completed()
            else:
                order.save()
            
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        
        return Response(
            {'error': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# ===== OTP-STYLE ORDER ENDPOINTS (CAB-LIKE) =====
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_otp(request):
    """
    Student portal: create an OTP with order payload (code acts as OTP).
    
    This endpoint:
    1. Creates an OTP with the order details
    2. Immediately deducts stock from inventory
    3. Returns the OTP code for the student
    """
    try:
        serializer = CreateOrderOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = serializer.save()
        
        # Deduct stock immediately upon order confirmation
        payload = otp.payload
        items_by_counter = payload.get('items_by_counter', {})
        
        from menu.models import FoodItem
        stock_errors = []
        
        for counter_id, items in items_by_counter.items():
            for item in items:
                food_item_id = item.get('food_item_id') or item.get('id')
                quantity = item.get('quantity', 0)
                
                if not food_item_id:
                    continue
                
                try:
                    food_item = FoodItem.objects.get(id=food_item_id)
                    
                    # Check if sufficient stock is available
                    if food_item.stock < quantity:
                        stock_errors.append(f"{food_item.name}: Only {food_item.stock} available, requested {quantity}")
                        continue
                    
                    # Deduct stock
                    food_item.stock -= quantity
                    food_item.save(update_fields=['stock'])
                    
                    # Mark unavailable if out of stock
                    food_item.mark_unavailable_if_out_of_stock()
                    
                    print(f"✅ Stock deducted: {food_item.name} - {quantity} units (remaining: {food_item.stock})")
                    
                except FoodItem.DoesNotExist:
                    stock_errors.append(f"Item ID {food_item_id} not found")
                except Exception as e:
                    stock_errors.append(f"Error processing item {food_item_id}: {str(e)}")
        
        # If there were stock errors, include them in response but don't fail the order
        response_data = OrderOTPSerializer(otp).data
        if stock_errors:
            response_data['stock_warnings'] = stock_errors
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_by_code(request, code: str):
    """Staff portal: fetch order payload by code if active and not expired."""
    try:
        otp = OrderOTP.objects.filter(code=code).first()
        if not otp:
            return Response({'error': 'Order code not found'}, status=status.HTTP_404_NOT_FOUND)
        # Expiry check
        if otp.expires_at < timezone.now():
            otp.status = 'expired'
            otp.save(update_fields=['status', 'updated_at'])
            return Response({'error': 'Order code expired'}, status=status.HTTP_410_GONE)
        if otp.status == 'used':
            return Response({'error': 'Order code already used'}, status=status.HTTP_409_CONFLICT)
        return Response(OrderOTPSerializer(otp).data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_status_by_code(request, code: str):
    """Student portal: fetch only the OTP status in a 200 response to avoid 4xx noise.
    Always returns HTTP 200 with a simple status payload: active|used|expired|not_found.
    """
    try:
        otp = OrderOTP.objects.filter(code=code).first()
        if not otp:
            return Response({'status': 'not_found'})
        # Expiry check
        now = timezone.now()
        if otp.expires_at < now:
            # Optionally persist expired status for consistency
            if otp.status != 'expired':
                otp.status = 'expired'
                otp.save(update_fields=['status', 'updated_at'])
            return Response({
                'status': 'expired',
                'expires_at': otp.expires_at,
                'used_at': otp.used_at
            })
        # Active or Used
        return Response({
            'status': otp.status,
            'expires_at': otp.expires_at,
            'used_at': otp.used_at
        })
    except Exception as e:
        # Even on errors, don't emit 5xx to avoid noisy console; include detail for debugging
        return Response({'status': 'error', 'detail': str(e)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def consume_order_code(request, code: str):
    """DEPRECATED: Use deliver_counter_items instead for counter-based delivery"""
    try:
        otp = OrderOTP.objects.filter(code=code).first()
        if not otp:
            return Response({'error': 'Order code not found'}, status=status.HTTP_404_NOT_FOUND)
        if otp.expires_at < timezone.now():
            otp.status = 'expired'
            otp.save(update_fields=['status', 'updated_at'])
            return Response({'error': 'Order code expired'}, status=status.HTTP_410_GONE)
        if otp.status == 'used':
            return Response({'error': 'Order code already used'}, status=status.HTTP_409_CONFLICT)
        otp.mark_used()
        return Response(OrderOTPSerializer(otp).data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deliver_counter_items(request, code: str):
    """
    Staff portal: Mark items delivered for a specific counter.
    
    This endpoint allows each counter staff to independently mark their items as delivered.
    - The OTP can be used by multiple counters (once per counter)
    - Each counter can only mark their own items
    - Once all counters deliver, the OTP status becomes 'used'
    
    Request body:
    {
        "counter_id": 1,
        "item_ids": [1, 2, 3]
    }
    """
    try:
        # Get staff info
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get OTP
        otp = OrderOTP.objects.filter(code=code).first()
        if not otp:
            return Response({'error': 'Order code not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check expiry
        if otp.expires_at < timezone.now():
            if otp.status != 'expired':
                otp.status = 'expired'
                otp.save(update_fields=['status', 'updated_at'])
            return Response({'error': 'Order code expired'}, status=status.HTTP_410_GONE)
        
        # Get counter_id from request
        counter_id = request.data.get('counter_id')
        item_ids = request.data.get('item_ids', [])
        
        if not counter_id:
            return Response({'error': 'counter_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Map staff's counter choice to counter ID
        # Note: staff.counter is a CharField (e.g., 'VEG_MEALS'), not a ForeignKey
        staff_counter_id = COUNTER_CHOICE_TO_ID.get(staff.counter)
        if not staff_counter_id:
            return Response(
                {'error': 'Staff counter not properly configured. Please contact admin.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Flexible counter access: Allow cross-counter help
        # Staff can deliver from any counter, but log when they're helping other counters
        is_primary_counter = staff_counter_id == int(counter_id)
        if not is_primary_counter:
            # Log cross-counter assistance for audit purposes
            print(f"📝 Cross-counter assistance: {request.user.username} (assigned to counter {staff_counter_id}) helping with counter {counter_id}")
            
            # Optional: You can add additional checks here if needed
            # For example, only allow during peak hours or with supervisor approval
            # For now, we'll allow it to improve workflow flexibility
        
        # Check if this counter has already delivered
        if otp.has_counter_delivered(counter_id):
            return Response(
                {
                    'error': 'Items already delivered for this counter',
                    'message': f'✅ Items from this counter were already delivered'
                }, 
                status=status.HTTP_409_CONFLICT
            )
        
        # Validate items belong to this counter
        payload_items = otp.payload.get('items_by_counter', {}).get(str(counter_id), [])
        payload_item_ids = [item.get('id') for item in payload_items]
        
        # Verify all requested items are from this counter
        invalid_items = [item_id for item_id in item_ids if item_id not in payload_item_ids]
        if invalid_items:
            return Response(
                {'error': f'Invalid item IDs for this counter: {invalid_items}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark counter as delivered
        otp.mark_counter_delivered(
            counter_id=counter_id,
            staff_username=request.user.username,
            item_ids=item_ids
        )
        
        # Deduct stock for delivered items
        from menu.models import FoodItem
        for item in payload_items:
            if item.get('id') in item_ids:
                try:
                    food_item = FoodItem.objects.get(id=item.get('food_item_id'))
                    if food_item.stock >= item.get('quantity', 0):
                        food_item.stock -= item.get('quantity', 0)
                        food_item.save(update_fields=['stock'])
                        # Mark unavailable if out of stock
                        food_item.mark_unavailable_if_out_of_stock()
                except FoodItem.DoesNotExist:
                    pass
        
        return Response({
            'success': True,
            'message': 'Items delivered successfully',
            'cross_counter_help': not is_primary_counter,
            'primary_counter_id': staff_counter_id,
            'delivered_counter_id': int(counter_id),
            'all_items_delivered': otp.all_items_delivered,
            'counters_delivered': list(otp.counters_delivered.keys()),
            'status': otp.status,
            'otp': OrderOTPSerializer(otp).data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_dashboard_data(request):
    """Get dashboard statistics for staff"""
    try:
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = timezone.now().date()
        
        # Today's orders
        today_orders = Order.objects.filter(created_at__date=today)
        
        # Calculate stats
        total_orders = today_orders.count()
        total_revenue = today_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Active items count (available items with stock > 0)
        from menu.models import FoodItem
        active_items = FoodItem.objects.filter(is_available=True, stock__gt=0).count()
        
        # Low stock items (stock <= 5)
        low_stock_items = FoodItem.objects.filter(is_available=True, stock__lte=5, stock__gt=0).count()
        
        return Response({
            'totalOrders': total_orders,
            'totalRevenue': float(total_revenue),
            'activeItems': active_items,
            'lowStockItems': low_stock_items,
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch dashboard data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_data(request):
    """Get analytics data for staff dashboard"""
    try:
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        period = request.query_params.get('period', 'today')
        today = timezone.now().date()
        
        if period == 'today':
            orders = Order.objects.filter(created_at__date=today, status='completed')
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
            orders = Order.objects.filter(created_at__date__gte=start_date, status='completed')
        elif period == 'month':
            start_date = today - timedelta(days=30)
            orders = Order.objects.filter(created_at__date__gte=start_date, status='completed')
        else:
            orders = Order.objects.filter(status='completed')
            start_date = today
        
        # Basic stats
        total_orders = orders.count()
        total_revenue = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        avg_order_value = orders.aggregate(avg=Avg('total_amount'))['avg'] or 0
        
        # Top selling items
        top_items = OrderItem.objects.filter(
            order__in=orders
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            quantity=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-quantity')[:10]
        
        # Daily revenue for the week (if period is week)
        daily_revenue = []
        if period == 'week':
            for i in range(7):
                day = today - timedelta(days=i)
                day_orders = Order.objects.filter(
                    created_at__date=day, 
                    status='completed'
                )
                day_revenue = day_orders.aggregate(total=Sum('total_amount'))['total'] or 0
                daily_revenue.append({
                    'day': day.strftime('%a'),
                    'date': day,
                    'revenue': float(day_revenue)
                })
            daily_revenue.reverse()
        
        # Item performance
        from menu.models import FoodItem
        
        # Most popular items (by order count)
        popular_items = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            orders=Count('order', distinct=True)
        ).order_by('-orders')[:10]
        
        # Least popular items
        least_popular = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            orders=Count('order', distinct=True)
        ).order_by('orders')[:5]
        
        # Out of stock / low stock items
        out_of_stock = FoodItem.objects.filter(
            Q(stock=0) | Q(stock__lte=5)
        ).values('id', 'name', 'stock')[:10]
        
        return Response({
            'todayStats' if period == 'today' else f'{period}Stats': {
                'totalOrders': total_orders,
                'totalRevenue': float(total_revenue),
                'averageOrderValue': float(avg_order_value),
                'topSellingItems': list(top_items),
                'dailyRevenue': daily_revenue if period == 'week' else []
            },
            'itemStats': {
                'mostPopular': list(popular_items),
                'leastPopular': list(least_popular),
                'outOfStock': list(out_of_stock)
            }
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch analytics data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyticsAPIView(generics.GenericAPIView):
    """Optimized analytics endpoint with strategic indexing"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive analytics with optimized queries"""
        try:
            period = request.query_params.get('period', 'today')
            today = timezone.now().date()
            
            # Calculate date range efficiently
            if period == 'today':
                start_date = today
                end_date = today
            elif period == 'week':
                start_date = today - timedelta(days=7)
                end_date = today
            elif period == 'month':
                start_date = today - timedelta(days=30)
                end_date = today
            else:
                start_date = today
                end_date = today
            
            # Optimized order statistics (uses status/created_at index)
            orders_queryset = Order.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            order_stats = orders_queryset.aggregate(
                total_orders=Count('id'),
                total_revenue=Sum('total_amount'),
                avg_order_value=Avg('total_amount'),
                completed_orders=Count('id', filter=Q(status='completed')),
                pending_orders=Count('id', filter=Q(status='pending'))
            )
            
            # Revenue by payment method (uses optimized filtering)
            payment_stats = orders_queryset.values('payment_method').annotate(
                count=Count('id'),
                revenue=Sum('total_amount')
            ).order_by('-revenue')
            
            # Top selling items with optimized joins
            top_items = OrderItem.objects.filter(
                order__created_at__date__gte=start_date,
                order__created_at__date__lte=end_date
            ).select_related('food_item').values(
                'food_item__id', 
                'food_item__name',
                'food_item__price'
            ).annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum('subtotal'),
                order_count=Count('order', distinct=True)
            ).order_by('-total_quantity')[:10]
            
            # Performance insights
            performance_data = {
                'query_optimizations': [
                    'Using student/status index for order filtering',
                    'Using status/created_at composite index', 
                    'Select_related for OrderItem queries',
                    'Aggregate functions minimize database hits'
                ],
                'cache_opportunities': [
                    'Daily analytics can be cached for 1 hour',
                    'Popular items can be cached for 30 minutes',
                    'Payment stats can be cached for 2 hours'
                ]
            }
            
            return Response({
                'period': period,
                'date_range': {
                    'start': start_date,
                    'end': end_date
                },
                'order_statistics': {
                    'total_orders': order_stats['total_orders'] or 0,
                    'total_revenue': float(order_stats['total_revenue'] or 0),
                    'average_order_value': float(order_stats['avg_order_value'] or 0),
                    'completed_orders': order_stats['completed_orders'] or 0,
                    'pending_orders': order_stats['pending_orders'] or 0,
                    'completion_rate': (
                        (order_stats['completed_orders'] or 0) / max(order_stats['total_orders'] or 1, 1) * 100
                    )
                },
                'payment_statistics': list(payment_stats),
                'top_selling_items': list(top_items),
                'performance_info': performance_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to fetch optimized analytics',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
