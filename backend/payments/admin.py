"""
Payment Admin Configuration
Admin interface for payment system models.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import PaymentMethod, Wallet, Transaction, PaymentRequest


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'payment_type', 'is_enabled', 'status', 'min_amount', 'max_amount', 'created_at')
    list_filter = ('payment_type', 'is_enabled', 'status', 'created_at')
    search_fields = ('name', 'description')
    ordering = ['name']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'payment_type', 'description')
        }),
        ('Configuration', {
            'fields': ('is_enabled', 'status', 'min_amount', 'max_amount')
        }),
        ('Fees', {
            'fields': ('transaction_fee_percentage', 'transaction_fee_flat')
        }),
        ('Gateway Config', {
            'fields': ('gateway_config',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'status', 'total_credited', 'total_debited', 'last_transaction_at')
    list_filter = ('status', 'created_at', 'last_transaction_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('balance', 'total_credited', 'total_debited', 'last_transaction_at', 'created_at', 'updated_at')
    ordering = ['-balance']
    
    fieldsets = (
        (None, {
            'fields': ('user', 'balance', 'status')
        }),
        ('Limits', {
            'fields': ('daily_spend_limit', 'monthly_spend_limit')
        }),
        ('Statistics', {
            'fields': ('total_credited', 'total_debited', 'last_transaction_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'wallet_user', 'transaction_type', 'formatted_amount', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'payment_method', 'created_at')
    search_fields = ('transaction_id', 'reference_id', 'wallet__user__username', 'description')
    readonly_fields = ('transaction_id', 'balance_before', 'balance_after', 'created_at', 'updated_at', 'processed_at')
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('transaction_id', 'wallet', 'transaction_type', 'amount', 'status')
        }),
        ('Details', {
            'fields': ('description', 'reference_id', 'payment_method')
        }),
        ('Balance', {
            'fields': ('balance_before', 'balance_after'),
            'classes': ('collapse',)
        }),
        ('Related', {
            'fields': ('order', 'refund_for'),
            'classes': ('collapse',)
        }),
        ('Gateway', {
            'fields': ('gateway_response',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'processed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def wallet_user(self, obj):
        return obj.wallet.user.username
    wallet_user.short_description = 'User'
    
    def formatted_amount(self, obj):
        color = 'green' if obj.transaction_type in ['credit', 'refund', 'bonus'] else 'red'
        symbol = '+' if obj.transaction_type in ['credit', 'refund', 'bonus'] else '-'
        return format_html(
            '<span style="color: {};">{} ₹{}</span>',
            color, symbol, obj.amount
        )
    formatted_amount.short_description = 'Amount'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('wallet__user', 'payment_method', 'order')


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'user', 'payment_method', 'amount', 'status', 'created_at', 'expires_at')
    list_filter = ('status', 'payment_method', 'created_at', 'expires_at')
    search_fields = ('request_id', 'user__username', 'gateway_request_id', 'purpose')
    readonly_fields = ('request_id', 'fee_amount', 'total_amount', 'created_at', 'updated_at', 'completed_at')
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('request_id', 'user', 'payment_method', 'status')
        }),
        ('Amount', {
            'fields': ('amount', 'fee_amount', 'total_amount')
        }),
        ('Details', {
            'fields': ('purpose', 'description', 'expires_at')
        }),
        ('Gateway', {
            'fields': ('gateway_request_id', 'gateway_payment_url', 'gateway_response'),
            'classes': ('collapse',)
        }),
        ('Related', {
            'fields': ('transaction',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'payment_method', 'transaction')
