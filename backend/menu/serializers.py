from rest_framework import serializers
from .models import Counter, FoodItem


class CounterSerializer(serializers.ModelSerializer):
    food_items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Counter
        fields = ['id', 'name', 'description', 'created_at', 'food_items_count']
    
    def get_food_items_count(self, obj):
        return obj.food_items.filter(is_available=True).count()


class FoodItemSerializer(serializers.ModelSerializer):
    counter_name = serializers.CharField(source='counter.name', read_only=True)
    counter_id = serializers.CharField(source='counter.id', read_only=True)
    
    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'description', 'price', 'image', 'image_url', 'stock', 
            'is_available', 'counter_name', 'counter_id', 'created_at', 'updated_at'
        ]


class MenuDataSerializer(serializers.Serializer):
    """Combined serializer for menu dashboard data"""
    counters = CounterSerializer(many=True, read_only=True)
    food_items = FoodItemSerializer(many=True, read_only=True)
    featured_items = FoodItemSerializer(many=True, read_only=True)
    popular_items = FoodItemSerializer(many=True, read_only=True)