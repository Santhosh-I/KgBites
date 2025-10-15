"""
Cache configuration and utilities for performance optimization
Implements industry-standard caching strategies for high-traffic applications
"""

from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib
import json
from typing import Any, Callable, Optional


class CacheKeys:
    """Centralized cache key management"""
    MENU_DATA = "menu_data_{user_type}"
    POPULAR_ITEMS = "popular_items_{period}"
    ANALYTICS_DATA = "analytics_{period}_{date}"
    COUNTER_LIST = "counter_list_{has_items}"
    FOOD_ITEMS_PAGE = "food_items_page_{page}_{filters}"
    ORDER_STATS = "order_stats_{period}_{date}"
    

class CacheTimeout:
    """Cache timeout constants in seconds"""
    MENU_DATA = 300  # 5 minutes
    POPULAR_ITEMS = 1800  # 30 minutes
    ANALYTICS_DATA = 3600  # 1 hour
    COUNTER_LIST = 600  # 10 minutes
    FOOD_ITEMS = 300  # 5 minutes
    ORDER_STATS = 1800  # 30 minutes


def cache_key_generator(*args, **kwargs) -> str:
    """Generate consistent cache keys from arguments"""
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items()) if kwargs else {}
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached_view(timeout: int = 300, key_prefix: str = "view"):
    """
    Simple manual caching helper - use cache.get/set directly in views for better compatibility
    
    Note: This decorator had compatibility issues with Django's @api_view decorator.
    Instead, use manual caching in views:
    
    cache_key = f"{key_prefix}_{user_id}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)
    # ... process data ...
    cache.set(cache_key, data, timeout)
    return Response(data)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # For compatibility, just execute the function without caching
            # Use manual caching in the view functions instead
            return func(*args, **kwargs)
        return wrapper
    return decorator


def cached_queryset(timeout: int = 300, key_prefix: str = "queryset"):
    """
    Decorator for caching queryset results
    
    Args:
        timeout: Cache timeout in seconds
        key_prefix: Prefix for cache key
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}_{func.__name__}_{cache_key_generator(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            if result is not None:
                cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


class CacheManager:
    """Centralized cache management utility"""
    
    @staticmethod
    def invalidate_menu_cache():
        """Invalidate all menu-related cache entries"""
        # Clear specific known cache keys for menu data
        # This works with LocMemCache backend
        cache_keys = [
            'menu_data_public',
            # Clear for all potential user IDs (simple approach)
            # In production with Redis, use pattern deletion
        ]
        
        # Clear public menu data
        for key in cache_keys:
            cache.delete(key)
        
        # Clear cache for authenticated users by clearing all
        # (LocMemCache doesn't support pattern deletion)
        cache.clear()
    
    @staticmethod
    def invalidate_analytics_cache():
        """Invalidate analytics cache entries"""
        # For LocMemCache, clear all cache
        cache.clear()
    
    @staticmethod
    def warm_cache():
        """Pre-warm frequently accessed cache entries"""
        # This would be called by a management command or celery task
        pass
    
    @staticmethod
    def get_cache_stats() -> dict:
        """Get cache performance statistics"""
        # In production, this would query Redis info
        return {
            'cache_backend': settings.CACHES['default']['BACKEND'],
            'cache_location': settings.CACHES['default'].get('LOCATION', 'Memory'),
            'timeout_configs': {
                'menu_data': CacheTimeout.MENU_DATA,
                'popular_items': CacheTimeout.POPULAR_ITEMS,
                'analytics': CacheTimeout.ANALYTICS_DATA,
            }
        }


# Utility functions for common cache operations
def get_or_set_cache(key: str, callable_func: Callable, timeout: int = 300) -> Any:
    """
    Get value from cache or set it using callable function
    
    Args:
        key: Cache key
        callable_func: Function to call if cache miss
        timeout: Cache timeout in seconds
    """
    result = cache.get(key)
    if result is None:
        result = callable_func()
        cache.set(key, result, timeout)
    return result


def cache_page_data(page_num: int, filters: dict, data: Any, timeout: int = 300):
    """Cache paginated data with filters"""
    filter_key = cache_key_generator(**filters)
    cache_key = f"page_data_{page_num}_{filter_key}"
    cache.set(cache_key, data, timeout)


def get_cached_page_data(page_num: int, filters: dict) -> Optional[Any]:
    """Get cached paginated data"""
    filter_key = cache_key_generator(**filters)
    cache_key = f"page_data_{page_num}_{filter_key}"
    return cache.get(cache_key)