from django.db import models
from django.contrib.auth.models import User

# Create your models here.

# Model for the Canteen Staff profile
class CanteenStaff(models.Model):
    """
    Extends the built-in User model for Canteen Staff.
    Each CanteenStaff profile is linked to a single User account.
    """
    class Gender(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'

    # This links the profile to a user account. If a User is deleted,
    # their CanteenStaff profile is also deleted.
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='canteen_staff_profile')
    
    # Staff-specific fields
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=1, choices=Gender.choices)
    id_number = models.CharField(max_length=100, unique=True, help_text="Unique ID number for the staff member.")
    avatar = models.ImageField(
        upload_to='avatars/staff/', 
        null=True, 
        blank=True, 
        help_text="Upload a profile picture for the staff member."
    )
    
    def __str__(self):
        return self.user.username

# Model for the Student profile
class Student(models.Model):
    """
    Extends the built-in User model for Students.
    Each Student profile is linked to a single User account.
    """
    # This links the profile to a user account.
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')

    # Student-specific fields
    full_name = models.CharField(max_length=255)
    roll_number = models.CharField(max_length=100, unique=True, help_text="Unique Roll Number of the student.")

    def __str__(self):
        return self.user.username