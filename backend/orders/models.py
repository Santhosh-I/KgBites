from django.db import models
from django.contrib.auth.models import User
from accounts.models import Student
from menu.models import FoodItem


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
    
    # Payment info
    payment_method = models.CharField(max_length=50, default='cash', db_index=True)
    payment_status = models.CharField(max_length=20, default='pending', db_index=True)
    
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
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['order', 'food_item']),
            models.Index(fields=['food_item', 'created_at']),
            models.Index(fields=['created_at']),
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
