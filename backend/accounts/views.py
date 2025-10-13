from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from .serializers import (
    StudentRegistrationSerializer,
    StaffRegistrationSerializer,
    UserLoginSerializer,
    StudentSerializer,
    StaffSerializer
)
from .models import Student, CanteenStaff


@api_view(['POST'])
@permission_classes([AllowAny])
def student_register(request):
    """Register a new student"""
    serializer = StudentRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        student = serializer.save()
        token, created = Token.objects.get_or_create(user=student.user)
        return Response({
            'message': 'Student registered successfully',
            'token': token.key,
            'user': StudentSerializer(student).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_register(request):
    """Register a new staff member"""
    serializer = StaffRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        staff = serializer.save()
        token, created = Token.objects.get_or_create(user=staff.user)
        return Response({
            'message': 'Staff registered successfully',
            'token': token.key,
            'user': StaffSerializer(staff).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """Login for both students and staff"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Determine user type and get profile data
        user_data = None
        user_type = None
        
        try:
            student = Student.objects.get(user=user)
            user_data = StudentSerializer(student).data
            user_type = 'student'
        except Student.DoesNotExist:
            try:
                staff = CanteenStaff.objects.get(user=user)
                user_data = StaffSerializer(staff).data
                user_type = 'staff'
            except CanteenStaff.DoesNotExist:
                user_type = 'admin'
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip()
                }
        
        return Response({
            'message': 'Login successful',
            'token': token.key,
            'user': user_data,
            'user_type': user_type
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_logout(request):
    """Logout user by deleting their token"""
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except:
        return Response({'error': 'Something went wrong'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    
    try:
        student = Student.objects.get(user=user)
        return Response({
            'user': StudentSerializer(student).data,
            'user_type': 'student'
        })
    except Student.DoesNotExist:
        try:
            staff = CanteenStaff.objects.get(user=user)
            return Response({
                'user': StaffSerializer(staff).data,
                'user_type': 'staff'
            })
        except CanteenStaff.DoesNotExist:
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip()
                },
                'user_type': 'admin'
            })


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_login(request):
    """Staff-specific login endpoint"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Check if user is staff
        try:
            staff = CanteenStaff.objects.get(user=user)
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'Login successful',
                'token': token.key,
                'user': StaffSerializer(staff).data,
                'user_type': 'staff'
            }, status=status.HTTP_200_OK)
        except CanteenStaff.DoesNotExist:
            return Response({
                'error': 'Invalid credentials or not authorized as staff'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_profile(request):
    """Get current staff profile"""
    try:
        staff = CanteenStaff.objects.get(user=request.user)
        return Response(StaffSerializer(staff).data)
    except CanteenStaff.DoesNotExist:
        return Response({
            'error': 'Staff profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
