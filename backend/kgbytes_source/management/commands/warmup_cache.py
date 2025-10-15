"""
Management command to warm up the application cache
Run this periodically in production to ensure optimal performance
"""

from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from menu.models import Counter, FoodItem
from orders.models import Order, OrderItem
from kgbytes_source.cache import CacheKeys, CacheTimeout


class Command(BaseCommand):
    help = 'Warm up application cache with frequently accessed data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-first',
            action='store_true',
            help='Clear existing cache before warming',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )

    def handle(self, *args, **options):
        if options['clear_first']:
            cache.clear()
            self.stdout.write('Cache cleared successfully')

        verbose = options['verbose']
        
        try:
            # Warm up menu data
            if verbose:
                self.stdout.write('Warming up menu data...')
            
            # Cache popular items for different periods
            periods = ['today', 'week', 'month']
            for period in periods:
                cache_key = CacheKeys.POPULAR_ITEMS.format(period=period)
                popular_items = self._get_popular_items(period)
                cache.set(cache_key, popular_items, CacheTimeout.POPULAR_ITEMS)
                if verbose:
                    self.stdout.write(f'  Cached popular items for {period}')

            # Cache counter list
            counters = Counter.objects.all()
            for has_items in [True, False]:
                cache_key = CacheKeys.COUNTER_LIST.format(has_items=has_items)
                filtered_counters = self._get_counters(has_items)
                cache.set(cache_key, filtered_counters, CacheTimeout.COUNTER_LIST)
                if verbose:
                    self.stdout.write(f'  Cached counters (has_items={has_items})')

            # Cache analytics data
            if verbose:
                self.stdout.write('Warming up analytics data...')
            
            today = timezone.now().date()
            for period in periods:
                cache_key = CacheKeys.ANALYTICS_DATA.format(period=period, date=today)
                analytics_data = self._get_analytics_data(period)
                cache.set(cache_key, analytics_data, CacheTimeout.ANALYTICS_DATA)
                if verbose:
                    self.stdout.write(f'  Cached analytics for {period}')

            # Cache menu data for different user types
            user_types = ['student', 'staff', 'admin']
            for user_type in user_types:
                cache_key = CacheKeys.MENU_DATA.format(user_type=user_type)
                menu_data = self._get_menu_data(user_type)
                cache.set(cache_key, menu_data, CacheTimeout.MENU_DATA)
                if verbose:
                    self.stdout.write(f'  Cached menu data for {user_type}')

            self.stdout.write(
                self.style.SUCCESS('Successfully warmed up application cache')
            )
            
            # Display cache statistics
            cache_stats = self._get_cache_stats()
            self.stdout.write('\nCache Statistics:')
            for key, value in cache_stats.items():
                self.stdout.write(f'  {key}: {value}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to warm up cache: {str(e)}')
            )

    def _get_popular_items(self, period):
        """Get popular items for a specific period"""
        today = timezone.now().date()
        
        if period == 'today':
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
        else:
            start_date = today

        from django.db import models
        return list(OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values(
            'food_item__id',
            'food_item__name',
            'food_item__price'
        ).annotate(
            total_quantity=models.Sum('quantity')
        ).order_by('-total_quantity')[:10])

    def _get_counters(self, has_items):
        """Get counters based on whether they have available items"""
        from django.db.models import Count, Q
        
        counters = Counter.objects.annotate(
            available_items=Count('food_items', filter=Q(food_items__is_available=True))
        )
        
        if has_items:
            counters = counters.filter(available_items__gt=0)
        else:
            counters = counters.filter(available_items=0)
            
        return list(counters.values('id', 'name', 'description', 'available_items'))

    def _get_analytics_data(self, period):
        """Get analytics data for a specific period"""
        from django.db.models import Count, Sum, Avg
        
        today = timezone.now().date()
        
        if period == 'today':
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
        else:
            start_date = today

        orders = Order.objects.filter(created_at__date__gte=start_date)
        
        return {
            'total_orders': orders.count(),
            'total_revenue': orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'avg_order_value': orders.aggregate(Avg('total_amount'))['total_amount__avg'] or 0,
            'completed_orders': orders.filter(status='completed').count(),
        }

    def _get_menu_data(self, user_type):
        """Get menu data for specific user type"""
        from django.db.models import Count, Q
        
        # Get available food items
        food_items = FoodItem.objects.filter(
            is_available=True, 
            stock__gt=0
        ).select_related('counter')
        
        # Get counters with available items
        counters = Counter.objects.annotate(
            available_items_count=Count('food_items', 
                filter=Q(food_items__is_available=True, food_items__stock__gt=0))
        ).filter(available_items_count__gt=0)
        
        return {
            'total_items': food_items.count(),
            'total_counters': counters.count(),
            'user_type': user_type,
            'cached_at': timezone.now().isoformat()
        }

    def _get_cache_stats(self):
        """Get basic cache statistics"""
        return {
            'cache_backend': 'django.core.cache.backends.locmem.LocMemCache',
            'warmup_completed': timezone.now().isoformat(),
            'menu_timeout': CacheTimeout.MENU_DATA,
            'analytics_timeout': CacheTimeout.ANALYTICS_DATA,
            'popular_items_timeout': CacheTimeout.POPULAR_ITEMS,
        }