"""
Standardized Pagination for PerfumeBooth API
Conforms to the standard success contract:
{
  "data": [...],
  "meta": {
    "request_id": "...",
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_count": 120,
      "total_pages": 6,
      "has_next": true,
      "has_previous": false,
      "next": "...",
      "previous": null
    }
  }
}
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from core.middleware import get_current_request_id


class StandardPagination(PageNumberPagination):
    """
    Standard pagination class delivering consistent pagination metadata inside meta.pagination.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        request_id = getattr(self.request, 'request_id', None) if hasattr(self, 'request') else None
        if not request_id:
            request_id = get_current_request_id() or ''

        total_count = self.page.paginator.count
        total_pages = self.page.paginator.num_pages

        return Response({
            'data': data,
            'meta': {
                'request_id': request_id,
                'pagination': {
                    'page': self.page.number,
                    'page_size': self.get_page_size(self.request),
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_next': self.page.has_next(),
                    'has_previous': self.page.has_previous(),
                    'next': self.get_next_link(),
                    'previous': self.get_previous_link(),
                }
            }
        })
