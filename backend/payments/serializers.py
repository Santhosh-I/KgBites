"""
Payment Serializers Module
Comprehensive serializers for payment system with proper validation.
"""

from rest_framework import serializers
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import PaymentMethod, Wallet, Transaction, PaymentRequest


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods"""
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'name', 'payment_type', 'description', 'is_enabled', 
            'status', 'min_amount', 'max_amount', 'transaction_fee_percentage',
            'transaction_fee_flat'
        ]
        read_only_fields = ['id']


class WalletSerializer(serializers.ModelSerializer):
    """Serializer for wallet information"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'user', 'user_name', 'user_full_name', 'balance', 
            'available_balance', 'status', 'daily_spend_limit', 
            'monthly_spend_limit', 'total_credited', 'total_debited',
            'last_transaction_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_name', 'user_full_name', 'balance',
            'available_balance', 'total_credited', 'total_debited',
            'last_transaction_at', 'created_at'
        ]

    def get_user_full_name(self, obj):
        """Get user's full name"""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_available_balance(self, obj):
        """Return current balance (same as balance for now)"""
        return obj.balance


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transaction records"""
    wallet_user = serializers.CharField(source='wallet.user.username', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    formatted_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_id', 'wallet', 'wallet_user', 'transaction_type',
            'transaction_type_display', 'amount', 'formatted_amount', 'description',
            'reference_id', 'payment_method', 'payment_method_name', 'status',
            'status_display', 'balance_before', 'balance_after', 'order',
            'created_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'wallet_user', 'transaction_type_display',
            'formatted_amount', 'payment_method_name', 'status_display',
            'balance_before', 'balance_after', 'created_at', 'processed_at'
        ]

    def get_formatted_amount(self, obj):
        """Format amount with currency symbol"""
        symbol = "+" if obj.transaction_type in ['credit', 'refund', 'bonus'] else "-"
        return f"{symbol}₹{obj.amount}"


class PaymentRequestSerializer(serializers.ModelSerializer):
    """Serializer for payment requests"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'request_id', 'user', 'user_name', 'payment_method',
            'payment_method_name', 'amount', 'fee_amount', 'total_amount',
            'purpose', 'description', 'status', 'status_display',
            'is_expired', 'expires_at', 'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'request_id', 'user_name', 'payment_method_name',
            'status_display', 'is_expired', 'fee_amount', 'total_amount',
            'created_at', 'completed_at'
        ]


class WalletTopUpSerializer(serializers.Serializer):
    """Serializer for wallet top-up requests"""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1.00'))
    payment_method_id = serializers.IntegerField()
    
    def validate_amount(self, value):
        """Validate top-up amount"""
        if value < Decimal('1.00'):
            raise serializers.ValidationError("Minimum top-up amount is ₹1.00")
        if value > Decimal('10000.00'):
            raise serializers.ValidationError("Maximum top-up amount is ₹10,000.00")
        return value
    
    def validate_payment_method_id(self, value):
        """Validate payment method exists and is enabled"""
        try:
            payment_method = PaymentMethod.objects.get(id=value)
            if not payment_method.is_enabled or payment_method.status != 'active':
                raise serializers.ValidationError("Selected payment method is not available")
            return value
        except PaymentMethod.DoesNotExist:
            raise serializers.ValidationError("Invalid payment method")


class TransactionCreateSerializer(serializers.Serializer):
    """Serializer for creating transactions"""
    transaction_type = serializers.ChoiceField(choices=Transaction.TRANSACTION_TYPES)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    description = serializers.CharField(max_length=500)
    reference_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_amount(self, value):
        """Validate transaction amount"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value


class WalletBalanceSerializer(serializers.Serializer):
    """Simple serializer for wallet balance information"""
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    daily_spent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    daily_limit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    monthly_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    monthly_limit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    can_transact = serializers.BooleanField(read_only=True)


class PaymentSummarySerializer(serializers.Serializer):
    """Serializer for payment summary dashboard"""
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_transactions = serializers.IntegerField(read_only=True)
    total_spent_today = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_spent_month = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    recent_transactions = TransactionSerializer(many=True, read_only=True)
    available_payment_methods = PaymentMethodSerializer(many=True, read_only=True)


class RefundRequestSerializer(serializers.Serializer):
    """Serializer for refund requests"""
    transaction_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    def validate_transaction_id(self, value):
        """Validate transaction exists and can be refunded"""
        try:
            transaction = Transaction.objects.get(transaction_id=value)
            if transaction.transaction_type != 'debit':
                raise serializers.ValidationError("Only debit transactions can be refunded")
            if transaction.status != 'completed':
                raise serializers.ValidationError("Only completed transactions can be refunded")
            return value
        except Transaction.DoesNotExist:
            raise serializers.ValidationError("Transaction not found")