"""
Menu Models Module
Defines database models for canteen menu system with industry-standard practices.
"""

from typing import Optional
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

class Counter(models.Model):
    """
    Represents a food counter in the canteen.
    
    Each counter serves as a category for organizing food items by type
    (e.g., 'Vegetarian Counter', 'Non-Vegetarian Counter', 'Snacks Counter').
    
    Attributes:
        name (str): Unique name of the counter (max 100 characters)
        description (str): Optional description of the counter's specialty
        created_at (datetime): Timestamp when counter was created
        
    Constraints:
        - Counter name must be unique
        - Name cannot be empty or whitespace only
    """
    name = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Name of the counter (e.g., 'Veg Counter')", 
        db_index=True
    )
    description = models.TextField(
        blank=True, 
        null=True, 
        help_text="Optional description of the counter's specialty"
    )
    
    # Timestamps for tracking
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['name']

    def clean(self) -> None:
        """Validate counter data before saving."""
        super().clean()
        if self.name and not self.name.strip():
            raise ValidationError("Counter name cannot be empty or whitespace only.")
        
    def save(self, *args, **kwargs) -> None:
        """Override save to ensure validation."""
        self.full_clean()
        super().save(*args, **kwargs)
        
    def __str__(self) -> str:
        return self.name
    
    def __repr__(self) -> str:
        return f"<Counter(id={self.id}, name='{self.name}')>"

class FoodItem(models.Model):
    """
    Represents a single food item available in the canteen.
    
    Each food item belongs to a counter and includes pricing, stock information,
    and availability status. Images can be uploaded or linked externally.
    
    Attributes:
        counter (Counter): The counter this item belongs to
        name (str): Name of the food item (max 100 characters)
        description (str): Detailed description of the food item
        price (Decimal): Price in currency units (max 999999.99)
        image (ImageField): Uploaded image file (optional)
        image_url (URLField): External image URL (optional)
        stock (int): Available quantity (0-9999)
        is_available (bool): Whether item is currently available for ordering
        created_at (datetime): When item was added to menu
        updated_at (datetime): Last modification timestamp
        
    Constraints:
        - Combination of counter and name must be unique
        - Price must be positive
        - Stock cannot be negative
    """
    counter = models.ForeignKey(
        Counter, 
        related_name='food_items', 
        on_delete=models.CASCADE, 
        db_index=True,
        help_text="The counter this item belongs to"
    )
    
    name = models.CharField(
        max_length=100, 
        help_text="Name of the food item", 
        db_index=True
    )
    description = models.TextField(
        help_text="Detailed description of the food item and ingredients"
    )
    price = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        help_text="Price in currency units",
        validators=[MinValueValidator(Decimal('0.01'))],
        db_index=True
    )
    
    image = models.ImageField(
        upload_to='food_images/', 
        blank=True, 
        null=True, 
        help_text="Upload an image of the food item"
    )
    image_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="External image URL (alternative to uploaded image)"
    )
    
    stock = models.PositiveIntegerField(
        default=0, 
        help_text="Available quantity in stock",
        validators=[MaxValueValidator(9999)],
        db_index=True
    )
    is_available = models.BooleanField(
        default=True, 
        help_text="Whether the item is available for ordering", 
        db_index=True
    )

    # Timestamps for tracking
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        # Ensures that you can't have two items with the same name in the same counter.
        unique_together = ('counter', 'name')
        # Strategic indexes for performance
        indexes = [
            models.Index(fields=['name', 'counter']),
            models.Index(fields=['is_available', 'created_at']),
            models.Index(fields=['counter', 'is_available']),
            models.Index(fields=['price', 'is_available']),
            models.Index(fields=['created_at']),
            models.Index(fields=['updated_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        # Improved string representation for admin panel
        return f"{self.name} - {self.counter.name}"

    def mark_unavailable_if_out_of_stock(self):
        """
        A helper method to automatically set is_available to False if stock reaches 0.
        """
        if self.stock == 0 and self.is_available:
            self.is_available = False
            self.save()