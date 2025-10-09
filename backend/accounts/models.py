from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class CanteenStaffProfile(models.Model):
    """
    Stores additional profile information for a Canteen Staff member,
    linked to the built-in User model.
    """
    
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    # The crucial link to the authentication model
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='canteen_profile')
    
    # Custom fields not present in the default User model
    gender = models.CharField(max_length=10, choices=Gender.choices)
    id_number = models.CharField(max_length=100, unique=True, help_text="College-issued ID number")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        full_name = self.user.get_full_name()
        return f"{full_name} ({self.user.username})"


# --- Student Profile ---

class StudentProfile(models.Model):
    """
    Stores additional profile information for a Student,
    linked to the built-in User model.
    """
    # The crucial link to the authentication model
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')

    # Custom field for students
    roll_number = models.CharField(max_length=50, unique=True, help_text="College-issued Roll Number")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        full_name = self.user.get_full_name()
        return f"{full_name} ({self.roll_number})"