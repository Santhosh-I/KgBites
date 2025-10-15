"""
API Response Standards for KG Bites Application
Provides consistent response formats and utilities for all API endpoints.
"""

from typing import Dict, Any, Optional, List, Union
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
from django.core.exceptions import ValidationError


class APIResponse:
    """
    Standardized API response formatter for consistent client experience.
    """
    
    @staticmethod
    def success(
        data: Any = None, 
        message: str = "Success", 
        status_code: int = status.HTTP_200_OK,
        meta: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Create a standardized success response.
        
        Args:
            data: The response data
            message: Success message
            status_code: HTTP status code
            meta: Additional metadata (pagination, etc.)
            
        Returns:
            Response: Formatted success response
        """
        response_data = {
            "success": True,
            "message": message,
            "data": data
        }
        
        if meta:
            response_data["meta"] = meta
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(
        message: str = "An error occurred",
        errors: Optional[Union[Dict, List, str]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None
    ) -> Response:
        """
        Create a standardized error response.
        
        Args:
            message: Error message
            errors: Detailed error information
            status_code: HTTP status code
            error_code: Application-specific error code
            
        Returns:
            Response: Formatted error response
        """
        response_data = {
            "success": False,
            "message": message
        }
        
        if errors:
            response_data["errors"] = errors
            
        if error_code:
            response_data["error_code"] = error_code
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def paginated(
        data: List[Any],
        page_number: int,
        page_size: int,
        total_items: int,
        message: str = "Success"
    ) -> Response:
        """
        Create a standardized paginated response.
        
        Args:
            data: The paginated data
            page_number: Current page number
            page_size: Items per page
            total_items: Total number of items
            message: Success message
            
        Returns:
            Response: Formatted paginated response
        """
        total_pages = (total_items + page_size - 1) // page_size
        
        meta = {
            "pagination": {
                "current_page": page_number,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_previous": page_number > 1,
                "has_next": page_number < total_pages
            }
        }
        
        return APIResponse.success(data=data, message=message, meta=meta)
    
    @staticmethod
    def not_found(message: str = "Resource not found") -> Response:
        """Create a standardized 404 response."""
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND"
        )
    
    @staticmethod
    def unauthorized(message: str = "Authentication required") -> Response:
        """Create a standardized 401 response."""
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_REQUIRED"
        )
    
    @staticmethod
    def forbidden(message: str = "Permission denied") -> Response:
        """Create a standardized 403 response."""
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED"
        )
    
    @staticmethod
    def validation_error(errors: Union[Dict, List, str]) -> Response:
        """Create a standardized validation error response."""
        return APIResponse.error(
            message="Validation failed",
            errors=errors,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR"
        )
    
    @staticmethod
    def internal_error(message: str = "Internal server error") -> Response:
        """Create a standardized 500 response."""
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR"
        )


class APIException(Exception):
    """
    Custom API exception for consistent error handling.
    """
    
    def __init__(
        self, 
        message: str, 
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None,
        errors: Optional[Union[Dict, List, str]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.errors = errors
        super().__init__(message)
    
    def to_response(self) -> Response:
        """Convert exception to API response."""
        return APIResponse.error(
            message=self.message,
            errors=self.errors,
            status_code=self.status_code,
            error_code=self.error_code
        )


# Custom exception classes for specific scenarios
class ResourceNotFoundError(APIException):
    """Exception for when a requested resource is not found."""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND"
        )


class ValidationError(APIException):
    """Exception for validation errors."""
    
    def __init__(self, errors: Union[Dict, List, str]):
        super().__init__(
            message="Validation failed",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            errors=errors
        )


class PermissionDeniedError(APIException):
    """Exception for permission denied scenarios."""
    
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED"
        )


class BusinessLogicError(APIException):
    """Exception for business logic violations."""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="BUSINESS_LOGIC_ERROR"
        )


# Status code constants for consistency
class HTTPStatus:
    """HTTP status code constants for consistent usage."""
    
    # Success
    OK = status.HTTP_200_OK
    CREATED = status.HTTP_201_CREATED
    ACCEPTED = status.HTTP_202_ACCEPTED
    NO_CONTENT = status.HTTP_204_NO_CONTENT
    
    # Client Error
    BAD_REQUEST = status.HTTP_400_BAD_REQUEST
    UNAUTHORIZED = status.HTTP_401_UNAUTHORIZED
    FORBIDDEN = status.HTTP_403_FORBIDDEN
    NOT_FOUND = status.HTTP_404_NOT_FOUND
    METHOD_NOT_ALLOWED = status.HTTP_405_METHOD_NOT_ALLOWED
    CONFLICT = status.HTTP_409_CONFLICT
    UNPROCESSABLE_ENTITY = status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # Server Error
    INTERNAL_ERROR = status.HTTP_500_INTERNAL_SERVER_ERROR
    BAD_GATEWAY = status.HTTP_502_BAD_GATEWAY
    SERVICE_UNAVAILABLE = status.HTTP_503_SERVICE_UNAVAILABLE