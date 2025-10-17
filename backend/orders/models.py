"""
Orders Models Module
Defines database models for order management with industry-standard practices.
"""

from typing import Optional
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from accounts.models import Student
from menu.models import FoodItem
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField


class OrderOTP(models.Model):
    """Server-side OTP order token that carries the order payload for cross-portal sync.
    This mirrors the cab booking OTP pattern: student creates, staff validates & consumes.
    """

    OTP_STATUS = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
    ]

    code = models.CharField(max_length=8, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=OTP_STATUS, default='active', db_index=True)
    payload = JSONField(default=dict)  # Stores order details: items_by_counter, totals, student info, etc.
    
    # Counter-based delivery tracking
    counters_delivered = JSONField(
        default=dict, 
        help_text='Tracks which counters have delivered their items: {counter_id: {delivered_at, delivered_by, item_ids}}'
    )
    all_items_delivered = models.BooleanField(
        default=False, 
        db_index=True, 
        help_text='True when all items from all counters are delivered'
    )

    # Audit / lifecycle fields
    generated_by = models.CharField(max_length=255, blank=True, null=True)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(blank=True, null=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['code', 'status']),
            models.Index(fields=['expires_at', 'status']),
            models.Index(fields=['all_items_delivered', 'status']),
        ]

    def __str__(self):
        return f"OTP {self.code} ({self.status})"

    @staticmethod
    def generate_code() -> str:
        import random, string
        letters = string.ascii_uppercase
        digits = string.digits
        for _ in range(100):
            code = ''.join(random.choice(letters) for _ in range(2)) + ''.join(random.choice(digits) for _ in range(4))
            if not OrderOTP.objects.filter(code=code).exists():
                return code
        # Fallback
        return 'OR' + str(int(timezone.now().timestamp()))[-4:]

    def mark_used(self):
        """Mark OTP as used - only when ALL counters have delivered"""
        self.status = 'used'
        self.used_at = timezone.now()
        self.save(update_fields=['status', 'used_at', 'updated_at'])
    
    def mark_counter_delivered(self, counter_id, staff_username, item_ids):
        """Mark that a specific counter has delivered its items"""
        from django.utils import timezone
        
        # Update counters_delivered
        if not isinstance(self.counters_delivered, dict):
            self.counters_delivered = {}
        
        self.counters_delivered[str(counter_id)] = {
            'delivered_at': timezone.now().isoformat(),
            'delivered_by': staff_username,
            'item_ids': item_ids
        }
        
        # Check if all counters have delivered
        payload_counters = self.payload.get('counters_involved', [])
        delivered_counter_ids = set(self.counters_delivered.keys())
        expected_counter_ids = set(str(c) for c in payload_counters)
        
        self.all_items_delivered = delivered_counter_ids >= expected_counter_ids
        
        # If all delivered, mark as used
        if self.all_items_delivered and self.status == 'active':
            self.status = 'used'
            self.used_at = timezone.now()
        
        self.save(update_fields=['counters_delivered', 'all_items_delivered', 'status', 'used_at', 'updated_at'])
    
    def has_counter_delivered(self, counter_id):
        """Check if a specific counter has already delivered"""
        if not isinstance(self.counters_delivered, dict):
            return False
        return str(counter_id) in self.counters_delivered


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='orders', db_index=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    
    # Enhanced Payment info
    PAYMENT_METHODS = [
        ('wallet', 'Digital Wallet'),
        ('cash', 'Cash Payment'),
        ('upi', 'UPI Payment'),
        ('card', 'Credit/Debit Card'),
        ('campus_card', 'Campus ID Card'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partial_refund', 'Partially Refunded'),
    ]
    
    payment_method = models.CharField(
        max_length=50, 
        choices=PAYMENT_METHODS, 
        default='cash', 
        db_index=True
    )
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending', 
        db_index=True
    )
    
    # Payment tracking
    payment_reference = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_processed_at = models.DateTimeField(blank=True, null=True, db_index=True)
    
    # Special instructions
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    
    # Order completion time
    completed_at = models.DateTimeField(blank=True, null=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['payment_status', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['completed_at']),
            models.Index(fields=['student', 'created_at']),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.student.user.username}"

    @property
    def customer_name(self):
        return self.student.full_name or self.student.user.username

    def mark_completed(self):
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', db_index=True)
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, db_index=True)
    quantity = models.PositiveIntegerField(db_index=True)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    
    # Special instructions for this item
    special_instructions = models.TextField(blank=True, null=True)
    
    # Delivery tracking
    delivered = models.BooleanField(default=False, db_index=True, help_text='Whether this item has been delivered')
    delivered_at = models.DateTimeField(blank=True, null=True, db_index=True, help_text='When this item was delivered')
    delivered_by = models.CharField(max_length=255, blank=True, null=True, help_text='Staff member who delivered this item')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['order', 'food_item']),
            models.Index(fields=['food_item', 'created_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['delivered', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quantity}x {self.food_item.name} - Order #{self.order.id}"

    @property
    def name(self):
        return self.food_item.name

    @property
    def price(self):
        return self.total_price

    def save(self, *args, **kwargs):
        # Auto-calculate total_price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
    
    def mark_delivered(self, staff_username):
        """Mark this item as delivered"""
        from django.utils import timezone
        self.delivered = True
        self.delivered_at = timezone.now()
        self.delivered_by = staff_username
        self.save(update_fields=['delivered', 'delivered_at', 'delivered_by'])
