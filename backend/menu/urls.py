from django.urls import path
from . import views

urlpatterns = [
    path('data/', views.get_menu_data, name='menu-data'),
    path('counters/', views.get_counters, name='counters-list'),
    path('items/', views.get_all_items, name='all-items-list'),
    path('items/<int:item_id>/', views.update_item, name='update-item'),
    path('available-items/', views.get_food_items, name='available-items-list'),
    path('item-detail/<int:item_id>/', views.get_food_item_detail, name='food-item-detail'),
]