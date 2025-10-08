# backend/menu/models.py

from django.db import models

class Counter(models.Model):
    """
    Represents a food counter in the canteen.
    Examples: 'Veg Counter', 'BCJ Counter', 'Snacks Counter'
    """
    name = models.CharField(max_length=100, unique=True, help_text="Name of the counter")
    description = models.TextField(blank=True, null=True, help_text="Optional description for the counter")
    
    # Timestamps for tracking
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class FoodItem(models.Model):
    """
    Represents a single food item available in the canteen.
    """
    counter = models.ForeignKey(Counter, related_name='food_items', on_delete=models.CASCADE)
    
    name = models.CharField(max_length=100, help_text="Name of the food item")
    description = models.TextField(help_text="A brief description of the food item")
    price = models.DecimalField(max_digits=8, decimal_places=2, help_text="Price of the item")
    
    image = models.ImageField(upload_to='food_images/', blank=True, null=True, help_text="Image of the food item")
    
    stock = models.PositiveIntegerField(default=0, help_text="Available quantity or stock")
    is_available = models.BooleanField(default=True, help_text="Is the item available for ordering?")

    # Timestamps for tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Ensures that you can't have two items with the same name in the same counter.
        unique_together = ('counter', 'name')

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