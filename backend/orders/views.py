from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderCreateSerializer
from accounts.models import CanteenStaff


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Order.objects.all().select_related('student__user').prefetch_related('items')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date
        date_filter = self.request.query_params.get('date')
        if date_filter:
            today = timezone.now().date()
            if date_filter == 'today':
                queryset = queryset.filter(created_at__date=today)
            elif date_filter == 'yesterday':
                yesterday = today - timedelta(days=1)
                queryset = queryset.filter(created_at__date=yesterday)
            elif date_filter == 'week':
                week_ago = today - timedelta(days=7)
                queryset = queryset.filter(created_at__date__gte=week_ago)
        
        return queryset.order_by('-created_at')
    
    def partial_update(self, request, *args, **kwargs):
        """Update order status"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status and new_status in dict(Order.STATUS_CHOICES):
            order.status = new_status
            if new_status == 'completed':
                order.mark_completed()
            else:
                order.save()
            
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        
        return Response(
            {'error': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_dashboard_data(request):
    """Get dashboard statistics for staff"""
    try:
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = timezone.now().date()
        
        # Today's orders
        today_orders = Order.objects.filter(created_at__date=today)
        
        # Calculate stats
        total_orders = today_orders.count()
        total_revenue = today_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Active items count (available items with stock > 0)
        from menu.models import FoodItem
        active_items = FoodItem.objects.filter(is_available=True, stock__gt=0).count()
        
        # Low stock items (stock <= 5)
        low_stock_items = FoodItem.objects.filter(is_available=True, stock__lte=5, stock__gt=0).count()
        
        return Response({
            'totalOrders': total_orders,
            'totalRevenue': float(total_revenue),
            'activeItems': active_items,
            'lowStockItems': low_stock_items,
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch dashboard data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_data(request):
    """Get analytics data for staff dashboard"""
    try:
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=request.user)
        except CanteenStaff.DoesNotExist:
            return Response(
                {'error': 'Access denied. Staff only.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        period = request.query_params.get('period', 'today')
        today = timezone.now().date()
        
        if period == 'today':
            orders = Order.objects.filter(created_at__date=today, status='completed')
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
            orders = Order.objects.filter(created_at__date__gte=start_date, status='completed')
        elif period == 'month':
            start_date = today - timedelta(days=30)
            orders = Order.objects.filter(created_at__date__gte=start_date, status='completed')
        else:
            orders = Order.objects.filter(status='completed')
            start_date = today
        
        # Basic stats
        total_orders = orders.count()
        total_revenue = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        avg_order_value = orders.aggregate(avg=Avg('total_amount'))['avg'] or 0
        
        # Top selling items
        top_items = OrderItem.objects.filter(
            order__in=orders
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            quantity=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-quantity')[:10]
        
        # Daily revenue for the week (if period is week)
        daily_revenue = []
        if period == 'week':
            for i in range(7):
                day = today - timedelta(days=i)
                day_orders = Order.objects.filter(
                    created_at__date=day, 
                    status='completed'
                )
                day_revenue = day_orders.aggregate(total=Sum('total_amount'))['total'] or 0
                daily_revenue.append({
                    'day': day.strftime('%a'),
                    'date': day,
                    'revenue': float(day_revenue)
                })
            daily_revenue.reverse()
        
        # Item performance
        from menu.models import FoodItem
        
        # Most popular items (by order count)
        popular_items = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            orders=Count('order', distinct=True)
        ).order_by('-orders')[:10]
        
        # Least popular items
        least_popular = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values(
            'food_item__id', 'food_item__name'
        ).annotate(
            orders=Count('order', distinct=True)
        ).order_by('orders')[:5]
        
        # Out of stock / low stock items
        out_of_stock = FoodItem.objects.filter(
            Q(stock=0) | Q(stock__lte=5)
        ).values('id', 'name', 'stock')[:10]
        
        return Response({
            'todayStats' if period == 'today' else f'{period}Stats': {
                'totalOrders': total_orders,
                'totalRevenue': float(total_revenue),
                'averageOrderValue': float(avg_order_value),
                'topSellingItems': list(top_items),
                'dailyRevenue': daily_revenue if period == 'week' else []
            },
            'itemStats': {
                'mostPopular': list(popular_items),
                'leastPopular': list(least_popular),
                'outOfStock': list(out_of_stock)
            }
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch analytics data',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
