from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/student/register/', views.student_register, name='student_register'),
    path('auth/staff/register/', views.staff_register, name='staff_register'),
    path('auth/login/', views.user_login, name='user_login'),
    path('auth/logout/', views.user_logout, name='user_logout'),
    path('auth/profile/', views.user_profile, name='user_profile'),
    
    # Staff-specific endpoints
    path('staff/login/', views.staff_login, name='staff_login'),
    path('staff/profile/', views.staff_profile, name='staff_profile'),
    
    # General user endpoint
    path('user/', views.user_profile, name='current_user'),
]