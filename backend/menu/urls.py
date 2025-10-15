from django.urls import path
from . import views

urlpatterns = [
    path('data/', views.get_menu_data, name='menu-data'),
    path('counters/', views.get_counters, name='counters-list'),
    path('items/', views.get_all_items, name='all-items-list'),
    path('items/<int:item_id>/', views.update_item, name='update-item'),
    path('available-items/', views.get_food_items, name='available-items-list'),
    path('item-detail/<int:item_id>/', views.get_food_item_detail, name='food-item-detail'),
    
    # Enhanced API endpoints with pagination and filtering
    path('api/v1/items/', views.FoodItemListView.as_view(), name='api-items-list'),
    path('api/v1/counters/', views.CounterListView.as_view(), name='api-counters-list'),
    
    # Staff Management URLs
    path('staff/items/', views.staff_get_all_items, name='staff-items-list'),
    path('staff/items/create/', views.staff_create_item, name='staff-create-item'),
    path('staff/items/<int:item_id>/update/', views.staff_update_item, name='staff-update-item'),
    path('staff/items/<int:item_id>/delete/', views.staff_delete_item, name='staff-delete-item'),
    path('staff/counters/create/', views.staff_create_counter, name='staff-create-counter'),
]