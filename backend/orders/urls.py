from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.OrderViewSet, basename='orders')

urlpatterns = [
    # Staff dashboard data
    path('dashboard/', views.staff_dashboard_data, name='staff_dashboard'),
    path('analytics/', views.analytics_data, name='analytics_data'),
    
    # Enhanced API endpoints
    path('api/v1/analytics/', views.AnalyticsAPIView.as_view(), name='api-analytics'),

    # OTP Order endpoints (cab-like)
    path('otp/create/', views.create_order_otp, name='create_order_otp'),
    path('otp/code/<str:code>/', views.get_order_by_code, name='get_order_by_code'),
    path('otp/code/<str:code>/status/', views.get_order_status_by_code, name='get_order_status_by_code'),
    path('otp/code/<str:code>/consume/', views.consume_order_code, name='consume_order_code'),
    
    # Orders CRUD
    path('', include(router.urls)),
]