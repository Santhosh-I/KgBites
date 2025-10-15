# backend/kgbytes_source/filters.py

import django_filters
from django.db import models
from menu.models import FoodItem, Counter
from orders.models import Order, OrderItem


class FoodItemFilter(django_filters.FilterSet):
    """Advanced filtering for FoodItem model"""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    description = django_filters.CharFilter(lookup_expr='icontains')
    
    # Price filtering
    price_min = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    price_range = django_filters.RangeFilter(field_name='price')
    
    # Stock filtering
    stock_min = django_filters.NumberFilter(field_name='stock', lookup_expr='gte')
    stock_max = django_filters.NumberFilter(field_name='stock', lookup_expr='lte')
    in_stock = django_filters.BooleanFilter(field_name='stock', lookup_expr='gt', widget=django_filters.widgets.BooleanWidget())
    
    # Counter filtering
    counter = django_filters.ModelChoiceFilter(queryset=Counter.objects.all())
    counter_name = django_filters.CharFilter(field_name='counter__name', lookup_expr='icontains')
    
    # Date filtering
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    updated_after = django_filters.DateTimeFilter(field_name='updated_at', lookup_expr='gte')
    
    # Search across multiple fields
    search = django_filters.CharFilter(method='filter_search')
    
    class Meta:
        model = FoodItem
        fields = {
            'is_available': ['exact'],
            'created_at': ['exact', 'gte', 'lte'],
            'updated_at': ['exact', 'gte', 'lte'],
        }
    
    def filter_search(self, queryset, name, value):
        """Search across name, description, and counter name"""
        return queryset.filter(
            models.Q(name__icontains=value) |
            models.Q(description__icontains=value) |
            models.Q(counter__name__icontains=value)
        )


class CounterFilter(django_filters.FilterSet):
    """Filtering for Counter model"""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    description = django_filters.CharFilter(lookup_expr='icontains')
    has_items = django_filters.BooleanFilter(method='filter_has_items')
    
    class Meta:
        model = Counter
        fields = ['name', 'description']
    
    def filter_has_items(self, queryset, name, value):
        """Filter counters that have available items"""
        if value:
            return queryset.filter(food_items__is_available=True).distinct()
        return queryset


class OrderFilter(django_filters.FilterSet):
    """Advanced filtering for Order model"""
    
    # Status filtering
    status = django_filters.ChoiceFilter(choices=Order.STATUS_CHOICES)
    payment_status = django_filters.CharFilter(lookup_expr='icontains')
    payment_method = django_filters.CharFilter(lookup_expr='icontains')
    
    # Amount filtering
    total_min = django_filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    total_max = django_filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    
    # Date filtering
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    completed_after = django_filters.DateTimeFilter(field_name='completed_at', lookup_expr='gte')
    completed_before = django_filters.DateTimeFilter(field_name='completed_at', lookup_expr='lte')
    
    # Student filtering
    student_name = django_filters.CharFilter(field_name='student__full_name', lookup_expr='icontains')
    student_username = django_filters.CharFilter(field_name='student__user__username', lookup_expr='icontains')
    
    class Meta:
        model = Order
        fields = {
            'status': ['exact'],
            'payment_status': ['exact'],
            'created_at': ['exact', 'gte', 'lte'],
            'completed_at': ['exact', 'gte', 'lte'],
        }