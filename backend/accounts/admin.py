from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import CanteenStaff, Student

# Register your models here.
class CanteenStaffInline(admin.StackedInline):
    model = CanteenStaff
    can_delete = False
    verbose_name_plural = 'Canteen Staff Profile'

class StudentInline(admin.StackedInline):
    model = Student
    can_delete = False
    verbose_name_plural = 'Student Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (CanteenStaffInline, StudentInline)

admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(CanteenStaff)
class CanteenStaffAdmin(admin.ModelAdmin):
    # --- START OF CHANGES ---
    
    list_display = ('image_tag', 'user', 'full_name', 'id_number', 'gender', 'counter')
    search_fields = ('full_name', 'id_number', 'user__username')
    list_filter = ('counter', 'gender')

    # Method to display the image in the admin list view
    def image_tag(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="max-height: 40px; max-width: 40px;" />'.format(obj.avatar.url))
        return "No Image"
    
    image_tag.short_description = 'Avatar' # Sets the column header text

    # --- END OF CHANGES ---

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'roll_number')
    search_fields = ('full_name', 'roll_number', 'user__username')