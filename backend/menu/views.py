from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from .models import Counter, FoodItem
from .serializers import CounterSerializer, FoodItemSerializer, MenuDataSerializer
from accounts.models import CanteenStaff


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_menu_data(request):
    """Get complete menu data for dashboard"""
    try:
        # Get all counters with available items in stock (real-time sync)
        counters = Counter.objects.annotate(
            available_items_count=Count('food_items', filter=Q(food_items__is_available=True, food_items__stock__gt=0))
        ).filter(available_items_count__gt=0)
        
        # Get all available food items with stock > 0 (real-time sync with staff portal)
        food_items = FoodItem.objects.filter(is_available=True, stock__gt=0).select_related('counter')
        
        # Get featured items (items with good stock levels)
        featured_items = food_items.filter(stock__gt=10)[:6]
        
        # Get popular items (for now, we'll use recently created items)
        popular_items = food_items.order_by('-created_at')[:8]
        
        return Response({
            'counters': CounterSerializer(counters, many=True, context={'request': request}).data,
            'food_items': FoodItemSerializer(food_items, many=True, context={'request': request}).data,
            'featured_items': FoodItemSerializer(featured_items, many=True, context={'request': request}).data,
            'popular_items': FoodItemSerializer(popular_items, many=True, context={'request': request}).data,
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
        
        return Response({
            'message': 'Counter created successfully',
            'counter': CounterSerializer(counter).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
