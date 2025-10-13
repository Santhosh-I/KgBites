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

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Payment info
    payment_method = models.CharField(max_length=50, default='cash')
    payment_status = models.CharField(max_length=20, default='pending')
    
    # Special instructions
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Order completion time
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

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
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Special instructions for this item
    special_instructions = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

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
