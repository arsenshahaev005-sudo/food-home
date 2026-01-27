"""
Структурированное логирование для приложения.
Использует JSON формат для удобства парсинга и анализа.
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime
from typing import Optional

from django.conf import settings

# Context variables для trace_id и user_id
trace_id_var: ContextVar[Optional[str]] = ContextVar('trace_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)


class StructuredFormatter(logging.Formatter):
    """Форматер для структурированного JSON логирования."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'trace_id': trace_id_var.get(),
            'user_id': user_id_var.get(),
        }
        
        # Добавляем extra поля
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        # Добавляем информацию об исключении
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_data, ensure_ascii=False)


class StructuredLogger:
    """Обертка для структурированного логирования."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def _log(self, level: str, event_type: str, **kwargs) -> None:
        """Внутренний метод для логирования."""
        extra = {
            'event_type': event_type,
            **kwargs
        }
        getattr(self.logger, level)(extra.get('message', ''), extra={'extra': extra})
    
    def debug(self, event_type: str, **kwargs) -> None:
        """Логировать DEBUG сообщение."""
        self._log('debug', event_type, **kwargs)
    
    def info(self, event_type: str, **kwargs) -> None:
        """Логировать INFO сообщение."""
        self._log('info', event_type, **kwargs)
    
    def warning(self, event_type: str, **kwargs) -> None:
        """Логировать WARNING сообщение."""
        self._log('warning', event_type, **kwargs)
    
    def error(self, event_type: str, **kwargs) -> None:
        """Логировать ERROR сообщение."""
        self._log('error', event_type, **kwargs)
    
    def critical(self, event_type: str, **kwargs) -> None:
        """Логировать CRITICAL сообщение."""
        self._log('critical', event_type, **kwargs)


def setup_logging() -> None:
    """Настройка логирования для приложения."""
    
    # Создаем handler для stderr
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(StructuredFormatter())
    
    # Настройка root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    root_logger.handlers = [handler]
    
    # Настройка для Django
    django_logger = logging.getLogger('django')
    django_logger.setLevel(logging.WARNING)
    
    # Настройка для REST Framework
    drf_logger = logging.getLogger('rest_framework')
    drf_logger.setLevel(logging.INFO)


def get_logger(name: str) -> StructuredLogger:
    """Получить структурированный логгер."""
    return StructuredLogger(name)