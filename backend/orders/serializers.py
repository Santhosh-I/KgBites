from rest_framework import serializers
from .models import Order, OrderItem, OrderOTP
from menu.serializers import FoodItemSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='food_item.name', read_only=True)
    image = serializers.ImageField(source='food_item.image', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'name', 'image', 'quantity', 'unit_price', 
            'total_price', 'special_instructions'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'total_amount', 'status', 
            'payment_method', 'payment_status', 'notes', 
            'created_at', 'updated_at', 'completed_at', 'items'
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = serializers.ListField(child=serializers.DictField(), write_only=True)
    
    class Meta:
        model = Order
        fields = ['total_amount', 'payment_method', 'notes', 'items']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(
                order=order,
                food_item_id=item_data['food_item_id'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )
        
        return order


class OrderOTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderOTP
        fields = [
            'code', 'status', 'payload', 'generated_by',
            'expires_at', 'used_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'used_at', 'created_at', 'updated_at']


class CreateOrderOTPSerializer(serializers.Serializer):
    payload = serializers.DictField()
    generated_by = serializers.CharField(required=False, allow_blank=True)
    ttl_minutes = serializers.IntegerField(required=False, default=24*60)

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        payload = validated_data['payload']
        generated_by = validated_data.get('generated_by')
        ttl_minutes = validated_data.get('ttl_minutes', 24*60)
        expires_at = timezone.now() + timedelta(minutes=ttl_minutes)

        code = OrderOTP.generate_code()
        otp = OrderOTP.objects.create(
            code=code,
            payload=payload,
            generated_by=generated_by,
            expires_at=expires_at
        )
        return otp