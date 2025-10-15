from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Student, CanteenStaff


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user


class StudentRegistrationSerializer(serializers.ModelSerializer):
    user = UserRegistrationSerializer()
    
    class Meta:
        model = Student
        fields = ['user', 'full_name', 'roll_number']
    
    def validate_roll_number(self, value):
        if Student.objects.filter(roll_number=value).exists():
            raise serializers.ValidationError("Student with this roll number already exists.")
        return value
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = UserRegistrationSerializer().create(user_data)
        student = Student.objects.create(user=user, **validated_data)
        return student


class StaffRegistrationSerializer(serializers.ModelSerializer):
    user = UserRegistrationSerializer()
    
    class Meta:
        model = CanteenStaff
        fields = ['user', 'full_name', 'gender', 'id_number', 'counter', 'avatar']
    
    def validate_id_number(self, value):
        if CanteenStaff.objects.filter(id_number=value).exists():
            raise serializers.ValidationError("Staff with this ID number already exists.")
        return value
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = UserRegistrationSerializer().create(user_data)
        staff = CanteenStaff.objects.create(user=user, **validated_data)
        return staff


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include username and password')


class StudentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Student
        fields = ['id', 'username', 'email', 'full_name', 'roll_number']


class StaffSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = CanteenStaff
        fields = ['id', 'username', 'email', 'full_name', 'gender', 'id_number', 'counter', 'avatar']