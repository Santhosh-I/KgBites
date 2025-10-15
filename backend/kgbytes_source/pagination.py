# backend/kgbytes_source/pagination.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class with enhanced response format
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'pagination': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'page_size': self.page_size,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
            },
            'results': data
        })


class StandardPagination(CustomPageNumberPagination):
    """Standard pagination for most endpoints"""
    page_size = 20


class LargePagination(CustomPageNumberPagination):
    """For endpoints with large datasets"""
    page_size = 50


class SmallPagination(CustomPageNumberPagination):
    """For endpoints with smaller, frequently accessed data"""
    page_size = 10