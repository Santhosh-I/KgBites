"""
Payment Models Module
Comprehensive payment system with digital wallet, transactions, and payment methods.
Industry-standard implementation with security and auditability.
"""

from decimal import Decimal
from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import JSONField
import uuid
from typing import Optional


class PaymentMethod(models.Model):
    """
    Available payment methods in the system.
    Supports multiple payment gateways and types.
    """
    PAYMENT_TYPES = [
        ('wallet', 'Digital Wallet'),
        ('upi', 'UPI Payment'),
        ('card', 'Credit/Debit Card'),
        ('net_banking', 'Net Banking'),
        ('cash', 'Cash Payment'),
        ('campus_card', 'Campus ID Card'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
    ]

    name = models.CharField(max_length=100, help_text="Display name of payment method")
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, db_index=True)
    description = models.TextField(blank=True, help_text="Description of payment method")
    
    # Configuration
    is_enabled = models.BooleanField(default=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    max_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('10000.00'))
    
    # Gateway configuration (stored as JSON)
    gateway_config = JSONField(default=dict, blank=True, help_text="Payment gateway specific configuration")
    
    # Fees and charges
    transaction_fee_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00'),
        help_text="Transaction fee as percentage"
    )
    transaction_fee_flat = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        help_text="Flat transaction fee"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['payment_type', 'is_enabled']),
            models.Index(fields=['status', 'is_enabled']),
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_payment_type_display()})"

    def calculate_fee(self, amount: Decimal) -> Decimal:
        """Calculate transaction fee for given amount"""
        percentage_fee = amount * (self.transaction_fee_percentage / 100)
        total_fee = percentage_fee + self.transaction_fee_flat
        return total_fee.quantize(Decimal('0.01'))


class Wallet(models.Model):
    """
    Digital wallet for each user.
    Tracks balance and provides transaction history.
    """
    WALLET_STATUS = [
        ('active', 'Active'),
        ('frozen', 'Frozen'),
        ('suspended', 'Suspended'),
        ('closed', 'Closed'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Current wallet balance"
    )
    
    # Security and limits
    status = models.CharField(max_length=20, choices=WALLET_STATUS, default='active', db_index=True)
    daily_spend_limit = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('1000.00'),
        help_text="Daily spending limit"
    )
    monthly_spend_limit = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('10000.00'),
        help_text="Monthly spending limit"
    )
    
    # Tracking
    total_credited = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_debited = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    last_transaction_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'balance']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username}'s Wallet (₹{self.balance})"

    def can_debit(self, amount: Decimal) -> tuple[bool, str]:
        """Check if wallet can be debited for given amount"""
        if self.status != 'active':
            return False, f"Wallet is {self.status}"
        
        if amount <= 0:
            return False, "Amount must be positive"
        
        if self.balance < amount:
            return False, "Insufficient balance"
        
        # Check daily limit
        today = timezone.now().date()
        daily_spent = self.transactions.filter(
            transaction_type='debit',
            status='completed',
            created_at__date=today
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        if daily_spent + amount > self.daily_spend_limit:
            return False, "Daily spending limit exceeded"
        
        return True, "OK"

    @transaction.atomic
    def credit(self, amount: Decimal, description: str, reference: str = None, 
               payment_method: 'PaymentMethod' = None) -> 'Transaction':
        """Credit amount to wallet"""
        if amount <= 0:
            raise ValueError("Credit amount must be positive")
        
        # Create transaction record
        txn = Transaction.objects.create(
            wallet=self,
            transaction_type='credit',
            amount=amount,
            description=description,
            reference_id=reference or str(uuid.uuid4()),
            payment_method=payment_method,
            status='completed'
        )
        
        # Update wallet balance
        self.balance += amount
        self.total_credited += amount
        self.last_transaction_at = timezone.now()
        self.save(update_fields=['balance', 'total_credited', 'last_transaction_at', 'updated_at'])
        
        return txn

    @transaction.atomic
    def debit(self, amount: Decimal, description: str, reference: str = None) -> 'Transaction':
        """Debit amount from wallet"""
        can_debit, reason = self.can_debit(amount)
        if not can_debit:
            raise ValidationError(reason)
        
        # Create transaction record
        txn = Transaction.objects.create(
            wallet=self,
            transaction_type='debit',
            amount=amount,
            description=description,
            reference_id=reference or str(uuid.uuid4()),
            status='completed'
        )
        
        # Update wallet balance
        self.balance -= amount
        self.total_debited += amount
        self.last_transaction_at = timezone.now()
        self.save(update_fields=['balance', 'total_debited', 'last_transaction_at', 'updated_at'])
        
        return txn


class Transaction(models.Model):
    """
    Individual transaction record.
    Maintains complete audit trail of all wallet operations.
    """
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('refund', 'Refund'),
        ('fee', 'Fee'),
        ('bonus', 'Bonus'),
        ('penalty', 'Penalty'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    # Core transaction data
    transaction_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Transaction details
    description = models.TextField(help_text="Transaction description")
    reference_id = models.CharField(max_length=255, blank=True, db_index=True, help_text="External reference ID")
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS, default='pending', db_index=True)
    gateway_response = JSONField(default=dict, blank=True, help_text="Payment gateway response")
    
    # Balance tracking
    balance_before = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Related models
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_transactions')
    refund_for = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['wallet', 'transaction_type', 'status']),
            models.Index(fields=['created_at', 'status']),
            models.Index(fields=['reference_id', 'status']),
            models.Index(fields=['transaction_id']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} ₹{self.amount} - {self.wallet.user.username}"

    def save(self, *args, **kwargs):
        # Record balance before transaction
        if not self.balance_before and self.wallet_id:
            self.balance_before = self.wallet.balance
        
        super().save(*args, **kwargs)
        
        # Update processed_at when status changes to completed
        if self.status == 'completed' and not self.processed_at:
            self.processed_at = timezone.now()
            self.save(update_fields=['processed_at'])


class PaymentRequest(models.Model):
    """
    Payment request for external payment processing.
    Handles integration with payment gateways.
    """
    REQUEST_STATUS = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    # Core request data
    request_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_requests')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.CASCADE)
    
    # Amount and fees
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Request details
    purpose = models.CharField(max_length=255, help_text="Purpose of payment")
    description = models.TextField(blank=True)
    
    # Gateway integration
    gateway_request_id = models.CharField(max_length=255, blank=True, db_index=True)
    gateway_payment_url = models.URLField(blank=True)
    gateway_response = JSONField(default=dict, blank=True)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=REQUEST_STATUS, default='initiated', db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    
    # Related transaction
    transaction = models.OneToOneField(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_request')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['gateway_request_id']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment Request ₹{self.amount} - {self.user.username}"

    def is_expired(self) -> bool:
        """Check if payment request has expired"""
        return timezone.now() > self.expires_at

    def mark_completed(self, gateway_response: dict = None):
        """Mark payment request as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if gateway_response:
            self.gateway_response = gateway_response
        self.save(update_fields=['status', 'completed_at', 'gateway_response', 'updated_at'])


# Signal to create wallet when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    """Create wallet when new user is created"""
    if created:
        Wallet.objects.create(user=instance)
