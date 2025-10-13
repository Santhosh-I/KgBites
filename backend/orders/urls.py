from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.OrderViewSet, basename='orders')

urlpatterns = [
    # Staff dashboard data
    path('dashboard/', views.staff_dashboard_data, name='staff_dashboard'),
    path('analytics/', views.analytics_data, name='analytics_data'),
    
    # Orders CRUD
    path('', include(router.urls)),
]