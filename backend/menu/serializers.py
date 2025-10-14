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
    counter = CounterSerializer(read_only=True)
    image_display_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'description', 'price', 'image', 'image_url', 'image_display_url',
            'stock', 'is_available', 'counter', 'created_at', 'updated_at'
        ]
    
    def get_image_display_url(self, obj):
        """Get the appropriate image URL - either from uploaded file or external URL"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        elif obj.image_url:
            return obj.image_url
        return None


class MenuDataSerializer(serializers.Serializer):
    """Combined serializer for menu dashboard data"""
    counters = CounterSerializer(many=True, read_only=True)
    food_items = FoodItemSerializer(many=True, read_only=True)
    featured_items = FoodItemSerializer(many=True, read_only=True)
    popular_items = FoodItemSerializer(many=True, read_only=True)