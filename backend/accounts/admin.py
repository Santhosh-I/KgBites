from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import CanteenStaffProfile, StudentProfile

# Register your models here.
admin.site.unregister(User)

class CanteenStaffProfileInline(admin.StackedInline):
    """
    This makes the CanteenStaffProfile editable directly on the User admin page.
    """
    model = CanteenStaffProfile
    can_delete = False
    verbose_name_plural = 'Canteen Staff Profile'
    fk_name = 'user'

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    This custom User admin includes the CanteenStaffProfile inline.
    """
    inlines = (CanteenStaffProfileInline, )

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)

# --- Admin Configuration for Students ---

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """
    This provides a separate admin page for viewing and managing Student Profiles.
    """
    list_display = ('user', 'roll_number', 'created_at')
    search_fields = ('roll_number', 'user__username', 'user__first_name', 'user__last_name')