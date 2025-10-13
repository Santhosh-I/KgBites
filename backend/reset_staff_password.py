#!/usr/bin/env python
"""
Script to reset staff password for testing
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kgbytes_source.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import CanteenStaff

def reset_staff_password():
    print("Resetting staff password...")
    
    try:
        # Get the staff user
        staff_member = CanteenStaff.objects.first()
        if not staff_member:
            print("❌ No staff member found in database")
            return
        
        user = staff_member.user
        
        # Set a simple password for testing
        new_password = "staff123"
        user.set_password(new_password)
        user.save()
        
        print(f"✅ Password updated for staff: {user.username}")
        print(f"📝 Username: {user.username}")
        print(f"🔑 Password: {new_password}")
        print("\nYou can now log in to the staff portal with these credentials!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reset_staff_password()