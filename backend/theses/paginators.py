from rest_framework import pagination
from rest_framework.response import Response


class ItemPaginator(pagination.PageNumberPagination):
    page_size = 5


class ItemRegistration(pagination.PageNumberPagination):
    page_size = 8


class ReportMatrixPaginator(pagination.PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'

    def get_paginated_response(self, data):
        columns = getattr(self.request, 'columns', [])
        return Response({
            'columns': columns,
            'rows': data,
            'count': self.page.paginator.count,
        })