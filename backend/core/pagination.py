"""
Улучшенная система пагинации для API.
"""

from collections import OrderedDict
from urllib.parse import urlencode

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Стандартная пагинация с ограничениями.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        # Получаем текущий URL без параметров пагинации
        request = self.request
        
        # Убираем параметры пагинации из URL
        query_params = request.GET.copy()
        if 'page' in query_params:
            del query_params['page']
        if 'page_size' in query_params:
            del query_params['page_size']
        
        base_url = request.path
        if query_params:
            base_url += '?' + urlencode(query_params)
        else:
            base_url += '?'
        
        # Формируем URL для следующей и предыдущей страницы
        next_url = None
        previous_url = None
        
        if self.get_next_link():
            next_page = self.page.number + 1
            next_url = f"{base_url}page={next_page}"
            if self.page_size != self.page_size:
                next_url += f"&page_size={self.page_size}"
        
        if self.get_previous_link():
            prev_page = self.page.number - 1
            previous_url = f"{base_url}page={prev_page}"
            if self.page_size != self.page_size:
                previous_url += f"&page_size={self.page_size}"
        
        return Response(OrderedDict([
            ('success', True),
            ('data', data),
            ('pagination', OrderedDict([
                ('count', self.page.paginator.count),
                ('page_size', self.get_page_size(request)),
                ('current_page', self.page.number),
                ('total_pages', self.page.paginator.num_pages),
                ('next', next_url),
                ('previous', previous_url),
            ]))
        ]))


class SmallResultsSetPagination(PageNumberPagination):
    """
    Пагинация с маленьким размером страницы.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_paginated_response(self, data):
        return self._get_response(data)

    def _get_response(self, data):
        request = self.request
        
        query_params = request.GET.copy()
        if 'page' in query_params:
            del query_params['page']
        if 'page_size' in query_params:
            del query_params['page_size']
        
        base_url = request.path
        if query_params:
            base_url += '?' + urlencode(query_params)
        else:
            base_url += '?'
        
        next_url = None
        previous_url = None
        
        if self.get_next_link():
            next_page = self.page.number + 1
            next_url = f"{base_url}page={next_page}"
            if self.page_size != self.page_size:
                next_url += f"&page_size={self.page_size}"
        
        if self.get_previous_link():
            prev_page = self.page.number - 1
            previous_url = f"{base_url}page={prev_page}"
            if self.page_size != self.page_size:
                previous_url += f"&page_size={self.page_size}"
        
        return Response(OrderedDict([
            ('success', True),
            ('data', data),
            ('pagination', OrderedDict([
                ('count', self.page.paginator.count),
                ('page_size', self.get_page_size(request)),
                ('current_page', self.page.number),
                ('total_pages', self.page.paginator.num_pages),
                ('next', next_url),
                ('previous', previous_url),
            ]))
        ]))


class LargeResultsSetPagination(PageNumberPagination):
    """
    Пагинация с большим размером страницы.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def get_paginated_response(self, data):
        return self._get_response(data)

    def _get_response(self, data):
        request = self.request
        
        query_params = request.GET.copy()
        if 'page' in query_params:
            del query_params['page']
        if 'page_size' in query_params:
            del query_params['page_size']
        
        base_url = request.path
        if query_params:
            base_url += '?' + urlencode(query_params)
        else:
            base_url += '?'
        
        next_url = None
        previous_url = None
        
        if self.get_next_link():
            next_page = self.page.number + 1
            next_url = f"{base_url}page={next_page}"
            if self.page_size != self.page_size:
                next_url += f"&page_size={self.page_size}"
        
        if self.get_previous_link():
            prev_page = self.page.number - 1
            previous_url = f"{base_url}page={prev_page}"
            if self.page_size != self.page_size:
                previous_url += f"&page_size={self.page_size}"
        
        return Response(OrderedDict([
            ('success', True),
            ('data', data),
            ('pagination', OrderedDict([
                ('count', self.page.paginator.count),
                ('page_size', self.get_page_size(request)),
                ('current_page', self.page.number),
                ('total_pages', self.page.paginator.num_pages),
                ('next', next_url),
                ('previous', previous_url),
            ]))
        ]))