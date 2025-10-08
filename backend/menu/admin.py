from django.contrib import admin

# Register your models here.

from django.contrib import admin
from .models import Counter, FoodItem

@admin.register(Counter)
class CounterAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')

@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'counter', 'price', 'stock', 'is_available', 'created_at', 'updated_at')
    list_filter = ('counter', 'is_available')