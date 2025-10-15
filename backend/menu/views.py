"""
Menu Views Module
Handles all menu-related API endpoints with industry-standard practices.
"""

from typing import Dict, Any, Optional
from django.db.models import Count, Q, QuerySet
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.http import HttpRequest

from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request

from .models import Counter, FoodItem
from .serializers import CounterSerializer, FoodItemSerializer, MenuDataSerializer
from accounts.models import CanteenStaff
from kgbytes_source.pagination import StandardPagination, LargePagination
from kgbytes_source.cache import CacheManager


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_menu_data(request: Request) -> Response:
    """
    Retrieve complete menu data for dashboard.
    
    This endpoint provides optimized menu data including counters, food items,
    featured items, and popular items with strategic database queries and caching.
    
    Args:
        request: HTTP request object with authenticated user
        
    Returns:
        Response: JSON response containing:
            - counters: List of available counters with item counts
            - food_items: List of all available food items
            - featured_items: Top 6 items with good stock levels
            - popular_items: Top 8 recently created items
            - total_counters: Count of active counters
            - total_items: Count of available items
            - performance_info: Query optimization details
            
    Raises:
        HTTP_500_INTERNAL_SERVER_ERROR: If data retrieval fails
    """
    try:
        # Check cache first
        cache_key = f"menu_data_{request.user.id if request.user.is_authenticated else 'public'}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)
        
        # Use optimized queries with proper indexing
        available_items_filter = Q(food_items__is_available=True, food_items__stock__gt=0)
        
        # Get all counters with available items (uses counter/is_available index)
        counters = Counter.objects.annotate(
            available_items_count=Count('food_items', filter=available_items_filter)
        ).filter(available_items_count__gt=0).order_by('name')
        
        # Get all available food items (uses is_available/created_at index)
        food_items = FoodItem.objects.filter(
            is_available=True, 
            stock__gt=0
        ).select_related('counter').order_by('-created_at')
        
        # Get featured items with good stock (uses price/is_available index for better targeting)
        featured_items = food_items.filter(stock__gt=10)[:6]
        
        # Get popular items - use created_at ordering (indexed)
        popular_items = food_items[:8]
        
        # Cache counts to avoid multiple queries
        total_counters = counters.count()
        total_items = food_items.count()
        
        response_data = {
            'counters': CounterSerializer(counters, many=True, context={'request': request}).data,
            'food_items': FoodItemSerializer(food_items, many=True, context={'request': request}).data,
            'featured_items': FoodItemSerializer(featured_items, many=True, context={'request': request}).data,
            'popular_items': FoodItemSerializer(popular_items, many=True, context={'request': request}).data,
            'total_counters': total_counters,
            'total_items': total_items,
            'performance_info': {
                'query_optimized': True,
                'uses_indexes': ['is_available_created_at', 'counter_is_available', 'price_is_available']
            }
        }
        
        # Cache the response for 5 minutes
        cache.set(cache_key, response_data, 300)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch menu data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(cache_page(300), name='get')  # 5 minutes cache
class FoodItemListView(generics.ListAPIView):
    """Paginated and filterable list of food items for staff management with caching"""
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'counter__name']
    ordering_fields = ['name', 'price', 'stock', 'created_at', 'is_available']
    ordering = ['-created_at']

    def get_queryset(self):
        """Optimize query with select_related and apply filters"""
        queryset = FoodItem.objects.select_related('counter')
        
        # Filter by availability
        is_available = self.request.query_params.get('is_available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        
        # Filter by counter
        counter_id = self.request.query_params.get('counter')
        if counter_id:
            queryset = queryset.filter(counter_id=counter_id)
        
        # Filter by stock level
        stock_level = self.request.query_params.get('stock_level')
        if stock_level == 'out_of_stock':
            queryset = queryset.filter(stock=0)
        elif stock_level == 'low_stock':
            queryset = queryset.filter(stock__gt=0, stock__lte=5)
        elif stock_level == 'in_stock':
            queryset = queryset.filter(stock__gt=5)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_items(request):
    """Legacy endpoint - redirect to paginated view for better performance"""
    try:
        # For backward compatibility, return first page of items
        items = FoodItem.objects.select_related('counter')[:20]
        return Response(FoodItemSerializer(items, many=True, context={'request': request}).data)
    except Exception as e:
        return Response({
            'error': 'Failed to fetch items',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_item(request, item_id):
    """Update food item (stock, availability, etc.)"""
    try:
        from accounts.models import CanteenStaff
        
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        item = FoodItem.objects.get(id=item_id)
        
        # Update allowed fields
        if 'stock' in request.data:
            item.stock = request.data['stock']
        if 'is_available' in request.data:
            item.is_available = request.data['is_available']
        if 'price' in request.data:
            item.price = request.data['price']
            
        item.save()
        return Response(FoodItemSerializer(item, context={'request': request}).data)
        
    except FoodItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to update item',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(cache_page(600), name='get')  # 10 minutes cache
class CounterListView(generics.ListAPIView):
    """Paginated and searchable list of counters with caching"""
    serializer_class = CounterSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """Optimize query and apply filters"""
        queryset = Counter.objects.annotate(
            total_items=Count('food_items'),
            available_items=Count('food_items', filter=Q(food_items__is_available=True))
        )
        
        # Filter by availability of items
        has_items = self.request.query_params.get('has_items')
        if has_items == 'true':
            queryset = queryset.filter(available_items__gt=0)
        elif has_items == 'false':
            queryset = queryset.filter(available_items=0)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_counters(request):
    """Legacy endpoint - get all available counters"""
    try:
        counters = Counter.objects.annotate(
            available_items_count=Count('food_items', filter=Q(food_items__is_available=True))
        )
        return Response(CounterSerializer(counters, many=True).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_food_items(request):
    """Get food items, optionally filtered by counter"""
    try:
        counter_id = request.GET.get('counter_id')
        search_query = request.GET.get('search', '')
        
        food_items = FoodItem.objects.filter(is_available=True).select_related('counter')
        
        if counter_id:
            food_items = food_items.filter(counter_id=counter_id)
            
        if search_query:
            food_items = food_items.filter(
                Q(name__icontains=search_query) | 
                Q(description__icontains=search_query)
            )
            
        return Response(FoodItemSerializer(food_items, many=True, context={'request': request}).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_food_item_detail(request, item_id):
    """Get detailed information about a specific food item"""
    try:
        food_item = FoodItem.objects.select_related('counter').get(
            id=item_id, 
            is_available=True
        )
        return Response(FoodItemSerializer(food_item, context={'request': request}).data, status=status.HTTP_200_OK)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Food item not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Staff Management Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_get_all_items(request):
    """Get all items for staff management (including unavailable ones)"""
    try:
        # Verify user is staff
        try:
            CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        items = FoodItem.objects.all().select_related('counter').order_by('-created_at')
        counters = Counter.objects.all()
        
        response_data = {
            'items': FoodItemSerializer(items, many=True, context={'request': request}).data,
            'counters': CounterSerializer(counters, many=True).data,
            'total_items': items.count(),
            'available_items': items.filter(is_available=True).count(),
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_create_item(request):
    """Create a new food item (staff only) - supports both file upload and image URL"""
    try:
        # Verify user is staff
        try:
            CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        
        # Validate required fields
        required_fields = ['name', 'description', 'price', 'counter_id', 'stock']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate counter exists
        try:
            counter = Counter.objects.get(id=data['counter_id'])
        except Counter.DoesNotExist:
            return Response({'error': 'Counter not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle image - either file upload or URL
        image_file = request.FILES.get('image')
        image_url = data.get('image_url', '').strip()
        
        # Handle boolean conversion for is_available
        is_available = data.get('is_available', True)
        if isinstance(is_available, str):
            is_available = is_available.lower() in ['true', '1', 'yes', 'on']
        
        # Create the food item
        food_item = FoodItem.objects.create(
            name=data['name'],
            description=data['description'],
            price=float(data['price']),
            counter=counter,
            stock=int(data['stock']),
            is_available=bool(is_available),
            image=image_file if image_file else None,
            image_url=image_url
        )
        
        # Clear all menu data caches to ensure new item appears immediately
        CacheManager.invalidate_menu_cache()
        
        return Response({
            'message': 'Item created successfully',
            'item': FoodItemSerializer(food_item, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        print(f"❌ ValueError in staff_create_item: {e}")
        return Response({'error': 'Invalid price or stock value'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"❌ Exception in staff_create_item: {e}")
        print(f"❌ Request data: {data}")
        print(f"❌ Request FILES: {request.FILES}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def staff_update_item(request, item_id):
    """Update an existing food item (staff only)"""
    try:
        # Verify user is staff
        try:
            CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        food_item = get_object_or_404(FoodItem, id=item_id)
        data = request.data
        
        # Update fields if provided
        if 'name' in data:
            food_item.name = data['name']
        if 'description' in data:
            food_item.description = data['description']
        if 'price' in data:
            food_item.price = float(data['price'])
        if 'stock' in data:
            food_item.stock = int(data['stock'])
        if 'is_available' in data:
            is_available = data['is_available']
            if isinstance(is_available, str):
                is_available = is_available.lower() in ['true', '1', 'yes', 'on']
            food_item.is_available = bool(is_available)
        
        # Handle image updates - either file upload or URL
        if 'image' in request.FILES:
            food_item.image = request.FILES['image']
        if 'image_url' in data:
            food_item.image_url = data['image_url']
            
        if 'counter_id' in data:
            try:
                counter = Counter.objects.get(id=data['counter_id'])
                food_item.counter = counter
            except Counter.DoesNotExist:
                return Response({'error': 'Counter not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        food_item.save()
        
        # Clear all menu data caches to ensure updated item appears immediately
        CacheManager.invalidate_menu_cache()
        
        return Response({
            'message': 'Item updated successfully',
            'item': FoodItemSerializer(food_item, context={'request': request}).data
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        print(f"❌ ValueError in staff_update_item: {e}")
        return Response({'error': 'Invalid price or stock value'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"❌ Exception in staff_update_item: {e}")
        print(f"❌ Request data: {data}")
        print(f"❌ Request FILES: {request.FILES}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def staff_delete_item(request, item_id):
    """Delete a food item (staff only)"""
    try:
        # Verify user is staff
        try:
            CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        food_item = get_object_or_404(FoodItem, id=item_id)
        item_name = food_item.name
        food_item.delete()
        
        # Clear all menu data caches to ensure deleted item is removed immediately
        CacheManager.invalidate_menu_cache()
        
        return Response({
            'message': f'Item "{item_name}" deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_create_counter(request):
    """Create a new counter (staff only)"""
    try:
        # Verify user is staff
        try:
            CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        
        # Validate required fields
        if not data.get('name'):
            return Response({'error': 'Counter name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if counter already exists
        if Counter.objects.filter(name=data['name']).exists():
            return Response({'error': 'Counter with this name already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        counter = Counter.objects.create(
            name=data['name'],
            description=data.get('description', '')
        )
        
        # Clear menu cache when new counter is added
        CacheManager.invalidate_menu_cache()
        
        return Response({
            'message': 'Counter created successfully',
            'counter': CounterSerializer(counter).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
