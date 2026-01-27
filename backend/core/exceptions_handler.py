"""
Глобальный обработчик исключений для REST API.
"""

from django.core.exceptions import ValidationError
from django.db import DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .exceptions import BaseAppException
from .logging import get_logger, trace_id_var, user_id_var

logger = get_logger(__name__)


def custom_exception_handler(exc, context):
    """
    Кастомный обработчик исключений.
    
    Args:
        exc: Исключение
        context: Контекст (view, request и т.д.)
    
    Returns:
        Response объект или None
    """
    # Получаем trace_id и user_id из контекста
    trace_id = trace_id_var.get()
    user_id = user_id_var.get()
    
    # Обрабатываем наши кастомные исключения
    if isinstance(exc, BaseAppException):
        logger.error(
            'api_error',
            error_code=exc.error_code,
            message=exc.message,
            status_code=exc.status_code,
            trace_id=trace_id,
            user_id=user_id,
            details=exc.details,
            view=context['view'].__class__.__name__,
            path=context['request'].path
        )
        
        return Response(
            exc.to_dict(),
            status=exc.status_code
        )
    
    # Обрабатываем ошибки валидации Django
    if isinstance(exc, ValidationError):
        logger.warning(
            'validation_error',
            message=str(exc),
            trace_id=trace_id,
            user_id=user_id
        )
        
        return Response(
            {
                "success": False,
                "error": "Validation error",
                "error_code": "VALIDATION_ERROR",
                "details": exc.message_dict if hasattr(exc, 'message_dict') else {"non_field_errors": [str(exc)]}
            },
            status=status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    
    # Обрабатываем ошибки базы данных
    if isinstance(exc, DatabaseError):
        logger.error(
            'database_error',
            error=str(exc),
            trace_id=trace_id,
            user_id=user_id
        )
        
        return Response(
            {
                "success": False,
                "error": "Database error occurred",
                "error_code": "DATABASE_ERROR"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Для остальных исключений используем стандартный обработчик DRF
    response = exception_handler(exc, context)
    
    if response is not None:
        logger.error(
            'drf_exception',
            error=str(exc),
            status_code=response.status_code,
            trace_id=trace_id,
            user_id=user_id,
            view=context['view'].__class__.__name__
        )
        
        # Форматируем ответ в едином стиле
        if isinstance(response.data, dict):
            response.data = {
                "success": False,
                "error": str(exc),
                "error_code": "DRF_ERROR",
                "details": response.data
            }
        else:
            response.data = {
                "success": False,
                "error": str(exc),
                "error_code": "DRF_ERROR",
                "details": {"message": response.data}
            }
    
    return response