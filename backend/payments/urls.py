"""
Payment URL Configuration
Routes for all payment-related API endpoints.
"""

from django.urls import path, include
from . import views

app_name = 'payments'

urlpatterns = [
    # Payment Methods
    path('methods/', views.PaymentMethodListView.as_view(), name='payment-methods'),
    
    # Wallet Operations
    path('wallet/', views.get_wallet_info, name='wallet-info'),
    path('wallet/topup/', views.create_topup_request, name='wallet-topup'),
    path('wallet/topup/<uuid:request_id>/success/', views.simulate_payment_success, name='simulate-payment-success'),
    
    # Transactions
    path('transactions/', views.TransactionListView.as_view(), name='transactions-list'),
    path('summary/', views.get_payment_summary, name='payment-summary'),
    
    # Order Payments
    path('orders/<int:order_id>/pay/', views.process_order_payment, name='process-order-payment'),
    
    # Refunds
    path('refund/', views.request_refund, name='request-refund'),
    
    # Staff Operations
    path('staff/stats/', views.staff_payment_stats, name='staff-payment-stats'),
    path('staff/transactions/', views.staff_transactions, name='staff-transactions'),
    path('staff/requests/', views.staff_payment_requests, name='staff-payment-requests'),
    path('staff/refund/', views.staff_process_refund, name='staff-process-refund'),
]