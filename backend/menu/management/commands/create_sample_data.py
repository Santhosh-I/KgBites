from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Student, CanteenStaff
from menu.models import Counter, FoodItem
from orders.models import Order, OrderItem
import random


class Command(BaseCommand):
    help = 'Create sample data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')

        # Create staff user
        staff_user, created = User.objects.get_or_create(
            username='staff01',
            defaults={
                'email': 'staff@kgbites.com',
                'first_name': 'John',
                'last_name': 'Chef'
            }
        )
        if created:
            staff_user.set_password('staff123')
            staff_user.save()

        staff, created = CanteenStaff.objects.get_or_create(
            user=staff_user,
            defaults={
                'full_name': 'John Chef',
                'gender': 'M',
                'id_number': 'STF001'
            }
        )

        # Create student user
        student_user, created = User.objects.get_or_create(
            username='student01',
            defaults={
                'email': 'student@kgbites.com',
                'first_name': 'Jane',
                'last_name': 'Student'
            }
        )
        if created:
            student_user.set_password('student123')
            student_user.save()

        student, created = Student.objects.get_or_create(
            user=student_user,
            defaults={
                'full_name': 'Jane Student',
                'roll_number': 'STU001'
            }
        )

        # Create counters
        counters_data = [
            {'name': 'Veg Counter', 'description': 'Vegetarian food items'},
            {'name': 'Non-Veg Counter', 'description': 'Non-vegetarian food items'},
            {'name': 'Snacks Counter', 'description': 'Snacks and beverages'},
            {'name': 'Dessert Counter', 'description': 'Sweets and desserts'},
        ]

        counters = {}
        for counter_data in counters_data:
            counter, created = Counter.objects.get_or_create(
                name=counter_data['name'],
                defaults={'description': counter_data['description']}
            )
            counters[counter.name] = counter

        # Create food items
        food_items_data = [
            # Veg Counter
            {'name': 'Veg Biryani', 'description': 'Aromatic rice with vegetables', 'price': 80, 'counter': 'Veg Counter', 'stock': 25},
            {'name': 'Dal Rice', 'description': 'Steamed rice with lentil curry', 'price': 60, 'counter': 'Veg Counter', 'stock': 30},
            {'name': 'Paneer Curry', 'description': 'Spicy cottage cheese curry', 'price': 90, 'counter': 'Veg Counter', 'stock': 15},
            {'name': 'Veg Fried Rice', 'description': 'Stir-fried rice with vegetables', 'price': 70, 'counter': 'Veg Counter', 'stock': 20},
            
            # Non-Veg Counter
            {'name': 'Chicken Biryani', 'description': 'Aromatic rice with chicken', 'price': 120, 'counter': 'Non-Veg Counter', 'stock': 18},
            {'name': 'Mutton Curry', 'description': 'Spicy mutton curry', 'price': 150, 'counter': 'Non-Veg Counter', 'stock': 10},
            {'name': 'Fish Fry', 'description': 'Crispy fried fish', 'price': 100, 'counter': 'Non-Veg Counter', 'stock': 12},
            {'name': 'Chicken Fried Rice', 'description': 'Fried rice with chicken', 'price': 90, 'counter': 'Non-Veg Counter', 'stock': 15},
            
            # Snacks Counter
            {'name': 'Samosa', 'description': 'Deep fried triangular snack', 'price': 15, 'counter': 'Snacks Counter', 'stock': 50},
            {'name': 'Tea', 'description': 'Hot Indian tea', 'price': 10, 'counter': 'Snacks Counter', 'stock': 100},
            {'name': 'Coffee', 'description': 'Hot coffee', 'price': 15, 'counter': 'Snacks Counter', 'stock': 80},
            {'name': 'Vada Pav', 'description': 'Mumbai style burger', 'price': 25, 'counter': 'Snacks Counter', 'stock': 30},
            {'name': 'Sandwich', 'description': 'Grilled vegetable sandwich', 'price': 40, 'counter': 'Snacks Counter', 'stock': 20},
            
            # Dessert Counter
            {'name': 'Gulab Jamun', 'description': 'Sweet syrupy balls', 'price': 30, 'counter': 'Dessert Counter', 'stock': 25},
            {'name': 'Ice Cream', 'description': 'Vanilla ice cream', 'price': 35, 'counter': 'Dessert Counter', 'stock': 40},
            {'name': 'Kulfi', 'description': 'Traditional Indian ice cream', 'price': 25, 'counter': 'Dessert Counter', 'stock': 15},
        ]

        food_items = {}
        for item_data in food_items_data:
            counter = counters[item_data['counter']]
            food_item, created = FoodItem.objects.get_or_create(
                name=item_data['name'],
                counter=counter,
                defaults={
                    'description': item_data['description'],
                    'price': item_data['price'],
                    'stock': item_data['stock'],
                    'is_available': True
                }
            )
            food_items[item_data['name']] = food_item

        # Create some sample orders
        sample_orders = [
            {
                'items': [
                    {'name': 'Chicken Biryani', 'quantity': 2, 'price': 120},
                    {'name': 'Tea', 'quantity': 1, 'price': 10}
                ],
                'status': 'completed'
            },
            {
                'items': [
                    {'name': 'Veg Biryani', 'quantity': 1, 'price': 80},
                    {'name': 'Samosa', 'quantity': 2, 'price': 15}
                ],
                'status': 'preparing'
            },
            {
                'items': [
                    {'name': 'Dal Rice', 'quantity': 1, 'price': 60},
                    {'name': 'Coffee', 'quantity': 1, 'price': 15}
                ],
                'status': 'pending'
            },
            {
                'items': [
                    {'name': 'Fish Fry', 'quantity': 1, 'price': 100},
                    {'name': 'Vada Pav', 'quantity': 1, 'price': 25}
                ],
                'status': 'ready'
            },
            {
                'items': [
                    {'name': 'Paneer Curry', 'quantity': 1, 'price': 90},
                    {'name': 'Gulab Jamun', 'quantity': 2, 'price': 30}
                ],
                'status': 'confirmed'
            }
        ]

        for order_data in sample_orders:
            total_amount = sum(item['price'] * item['quantity'] for item in order_data['items'])
            
            order = Order.objects.create(
                student=student,
                total_amount=total_amount,
                status=order_data['status'],
                payment_method='cash'
            )
            
            for item_data in order_data['items']:
                food_item = food_items[item_data['name']]
                OrderItem.objects.create(
                    order=order,
                    food_item=food_item,
                    quantity=item_data['quantity'],
                    unit_price=item_data['price'],
                    total_price=item_data['price'] * item_data['quantity']
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created sample data:\n'
                f'- Staff user: staff01 / staff123\n'
                f'- Student user: student01 / student123\n'
                f'- {len(counters_data)} counters\n'
                f'- {len(food_items_data)} food items\n'
                f'- {len(sample_orders)} sample orders'
            )
        )