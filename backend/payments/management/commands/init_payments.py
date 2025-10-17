"""
Initialize Payment System
Management command to set up payment methods and system defaults.
"""

from django.core.management.base import BaseCommand
from decimal import Decimal
from payments.models import PaymentMethod


class Command(BaseCommand):
    help = 'Initialize payment system with default payment methods'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Initializing Payment System...'))
        
        # Create default payment methods
        payment_methods = [
            {
                'name': 'Digital Wallet',
                'payment_type': 'wallet',
                'description': 'Pay using your KgBites wallet balance',
                'is_enabled': True,
                'status': 'active',
                'min_amount': Decimal('1.00'),
                'max_amount': Decimal('50000.00'),
                'transaction_fee_percentage': Decimal('0.00'),
                'transaction_fee_flat': Decimal('0.00'),
            },
            {
                'name': 'UPI Payment',
                'payment_type': 'upi',
                'description': 'Pay using UPI apps like GPay, PhonePe, Paytm',
                'is_enabled': True,
                'status': 'active',
                'min_amount': Decimal('1.00'),
                'max_amount': Decimal('10000.00'),
                'transaction_fee_percentage': Decimal('0.00'),
                'transaction_fee_flat': Decimal('0.00'),
            },
            {
                'name': 'Credit/Debit Card',
                'payment_type': 'card',
                'description': 'Pay using your credit or debit card',
                'is_enabled': True,
                'status': 'active',
                'min_amount': Decimal('10.00'),
                'max_amount': Decimal('25000.00'),
                'transaction_fee_percentage': Decimal('2.50'),
                'transaction_fee_flat': Decimal('2.00'),
            },
            {
                'name': 'Net Banking',
                'payment_type': 'net_banking',
                'description': 'Pay directly from your bank account',
                'is_enabled': True,
                'status': 'active',
                'min_amount': Decimal('50.00'),
                'max_amount': Decimal('50000.00'),
                'transaction_fee_percentage': Decimal('1.00'),
                'transaction_fee_flat': Decimal('5.00'),
            },
            {
                'name': 'Cash Payment',
                'payment_type': 'cash',
                'description': 'Pay with cash at the counter',
                'is_enabled': True,
                'status': 'active',
                'min_amount': Decimal('1.00'),
                'max_amount': Decimal('5000.00'),
                'transaction_fee_percentage': Decimal('0.00'),
                'transaction_fee_flat': Decimal('0.00'),
            },
            {
                'name': 'Campus ID Card',
                'payment_type': 'campus_card',
                'description': 'Pay using your campus ID card balance',
                'is_enabled': False,  # Disabled by default
                'status': 'inactive',
                'min_amount': Decimal('1.00'),
                'max_amount': Decimal('2000.00'),
                'transaction_fee_percentage': Decimal('0.00'),
                'transaction_fee_flat': Decimal('0.00'),
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for method_data in payment_methods:
            payment_method, created = PaymentMethod.objects.get_or_create(
                name=method_data['name'],
                payment_type=method_data['payment_type'],
                defaults=method_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created payment method: {method_data["name"]}')
                )
            else:
                # Update existing method with new configuration
                for key, value in method_data.items():
                    setattr(payment_method, key, value)
                payment_method.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated payment method: {method_data["name"]}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Payment system initialized successfully!'
                f'\n📊 Created: {created_count} payment methods'
                f'\n🔄 Updated: {updated_count} payment methods'
                f'\n💳 Total payment methods: {PaymentMethod.objects.count()}'
            )
        )