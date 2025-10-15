"""
Custom Middleware for KG Bites Application
Provides industry-standard error handling, logging, and security features.
"""

import json
import logging
import time
from typing import Callable, Any
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import status

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(MiddlewareMixin):
    """
    Custom middleware for consistent error handling across the application.
    """
    
    def process_exception(self, request: HttpRequest, exception: Exception) -> JsonResponse:
        """
        Handle exceptions and return consistent error responses.
        
        Args:
            request: The HTTP request object
            exception: The exception that occurred
            
        Returns:
            JsonResponse: Standardized error response
        """
        # Log the exception
        logger.error(
            f"Exception in {request.path}: {type(exception).__name__}: {str(exception)}",
            extra={
                'request': request,
                'exception': exception,
                'user': request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
            },
            exc_info=True
        )
        
        # Handle different types of exceptions
        if isinstance(exception, ValidationError):
            return JsonResponse({
                'error': 'Validation Error',
                'message': str(exception),
                'status_code': 400
            }, status=status.HTTP_400_BAD_REQUEST)
            
        elif isinstance(exception, IntegrityError):
            return JsonResponse({
                'error': 'Database Integrity Error',
                'message': 'The request conflicts with existing data.',
                'status_code': 409
            }, status=status.HTTP_409_CONFLICT)
            
        elif isinstance(exception, PermissionError):
            return JsonResponse({
                'error': 'Permission Denied',
                'message': 'You do not have permission to perform this action.',
                'status_code': 403
            }, status=status.HTTP_403_FORBIDDEN)
        
        # For other exceptions, return a generic error in production
        from django.conf import settings
        if settings.DEBUG:
            return JsonResponse({
                'error': f'{type(exception).__name__}',
                'message': str(exception),
                'status_code': 500
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return JsonResponse({
                'error': 'Internal Server Error',
                'message': 'An unexpected error occurred. Please try again later.',
                'status_code': 500
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests for monitoring and debugging.
    """
    
    def process_request(self, request: HttpRequest) -> None:
        """Log incoming requests."""
        request.start_time = time.time()
        
        # Log API requests
        if request.path.startswith('/api/'):
            logger.info(
                f"API Request: {request.method} {request.path}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'user': request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                    'ip_address': self.get_client_ip(request)
                }
            )
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Log response information."""
        if hasattr(request, 'start_time') and request.path.startswith('/api/'):
            duration = time.time() - request.start_time
            logger.info(
                f"API Response: {request.method} {request.path} - {response.status_code} ({duration:.3f}s)",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'status_code': response.status_code,
                    'duration': duration,
                    'user': request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
                }
            )
        
        return response
    
    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        """Get the client's IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses.
    """
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Add security headers to response."""
        # Prevent clickjacking
        if not response.get('X-Frame-Options'):
            response['X-Frame-Options'] = 'DENY'
        
        # Prevent content type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # XSS Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Content Security Policy for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';"
        
        return response