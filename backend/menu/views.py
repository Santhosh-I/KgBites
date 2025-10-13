from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Counter, FoodItem
from .serializers import CounterSerializer, FoodItemSerializer, MenuDataSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_menu_data(request):
    """Get complete menu data for dashboard"""
    try:
        # Get all counters with available items
        counters = Counter.objects.annotate(
            available_items_count=Count('food_items', filter=Q(food_items__is_available=True))
        ).filter(available_items_count__gt=0)
        
        # Get all available food items
        food_items = FoodItem.objects.filter(is_available=True).select_related('counter')
        
        # Get featured items (you can add a featured field later)
        featured_items = food_items.filter(stock__gt=10)[:6]
        
        # Get popular items (for now, we'll use recently created items)
        popular_items = food_items.order_by('-created_at')[:8]
        
        return Response({
            'counters': CounterSerializer(counters, many=True).data,
            'food_items': FoodItemSerializer(food_items, many=True).data,
            'featured_items': FoodItemSerializer(featured_items, many=True).data,
            'popular_items': FoodItemSerializer(popular_items, many=True).data,
            'total_counters': counters.count(),
            'total_items': food_items.count(),
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch menu data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_items(request):
    """Get all food items for staff management"""
    try:
        items = FoodItem.objects.all().select_related('counter')
        return Response(FoodItemSerializer(items, many=True).data)
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
        return Response(FoodItemSerializer(item).data)
        
    except FoodItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to update item',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_counters(request):
    """Get all available counters"""
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
            
        return Response(FoodItemSerializer(food_items, many=True).data, status=status.HTTP_200_OK)
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
        return Response(FoodItemSerializer(food_item).data, status=status.HTTP_200_OK)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Food item not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
