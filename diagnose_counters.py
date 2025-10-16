"""
Quick diagnostic script to check counter IDs and staff assignments
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kgbytes_source.settings')
django.setup()

from menu.models import Counter
from accounts.models import CanteenStaff

print("=" * 60)
print("🔍 COUNTER & STAFF DIAGNOSTIC")
print("=" * 60)

print("\n📊 ALL COUNTERS IN DATABASE:")
print("-" * 60)
counters = Counter.objects.all()
for counter in counters:
    print(f"  ID: {counter.id:2d} | Name: '{counter.name}'")

print("\n👥 ALL STAFF ASSIGNMENTS:")
print("-" * 60)
staff_members = CanteenStaff.objects.select_related('user').all()
for staff in staff_members:
    # counter is a CharField with choices, not a ForeignKey
    counter_choice = staff.counter if staff.counter else "NOT ASSIGNED"
    counter_label = staff.get_counter_display() if staff.counter else "NOT ASSIGNED"
    print(f"  Staff: {staff.user.username:15s} | Counter: {counter_label:25s} (Choice: {counter_choice})")

print("\n🎯 STAFF01 DETAILS:")
print("-" * 60)
try:
    staff01 = CanteenStaff.objects.get(user__username='staff01')
    if staff01.counter:
        print(f"  Assigned Counter Choice: {staff01.counter}")
        print(f"  Display Name: {staff01.get_counter_display()}")
        print(f"\n  ⚠️  CRITICAL ISSUE FOUND:")
        print(f"  CanteenStaff.counter is a CharField, NOT a ForeignKey!")
        print(f"  But orders/views.py expects: staff.counter.id")
        print(f"  This will cause AttributeError: 'str' object has no attribute 'id'")
    else:
        print(f"  ⚠️  WARNING: staff01 has NO counter assigned!")
except CanteenStaff.DoesNotExist:
    print(f"  ❌ ERROR: staff01 not found in database!")

print("\n" + "=" * 60)
print("✅ Diagnostic Complete")
print("=" * 60)
