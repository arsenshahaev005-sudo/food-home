"""
Middleware для добавления trace_id в контекст.
"""

import uuid
from django.utils.deprecation import MiddlewareMixin
from .logging import trace_id_var, user_id_var


class TraceIDMiddleware(MiddlewareMixin):
    """Middleware для добавления trace_id в контекст."""
    
    def process_request(self, request):
        """Добавить trace_id в контекст."""
        # Получаем trace_id из заголовка или генерируем новый
        trace_id = request.META.get('HTTP_X_TRACE_ID') or str(uuid.uuid4())
        trace_id_var.set(trace_id)
        
        # Добавляем user_id если пользователь аутентифицирован
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id_var.set(str(request.user.id))
        
        # Добавляем trace_id в request для использования в views
        request.trace_id = trace_id