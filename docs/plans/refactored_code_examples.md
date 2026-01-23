# 🔧 Оптимизированная версия кода - Примеры рефакторинга

## 📁 Структура оптимизированного проекта

```
backend/
├── core/                          # Core/Shared Layer
│   ├── __init__.py
│   ├── exceptions.py              # Custom Exceptions
│   ├── validators.py              # Custom Validators
│   ├── constants.py               # Constants
│   ├── logging.py                 # Structured Logging
│   ├── pagination.py              # Custom Pagination
│   └── responses.py               # Unified Response Format
│
├── domain/                        # Domain Layer
│   ├── __init__.py
│   ├── entities/                  # Domain Entities
│   │   ├── __init__.py
│   │   ├── order.py
│   │   ├── producer.py
│   │   ├── dish.py
│   │   └── gift.py
│   ├── value_objects/             # Value Objects
│   │   ├── __init__.py
│   │   ├── money.py
│   │   ├── delivery_address.py
│   │   └── contact_info.py
│   └── repositories/              # Repository Interfaces
│       ├── __init__.py
│       ├── order_repository.py
│       ├── producer_repository.py
│       ├── dish_repository.py
│       └── gift_repository.py
│
├── application/                   # Application Layer
│   ├── __init__.py
│   ├── services/                  # Application Services
│   │   ├── __init__.py
│   │   ├── order_service.py
│   │   ├── payment_service.py
│   │   ├── gift_service.py
│   │   └── moderation_service.py
│   ├── commands/                  # Commands
│   │   ├── __init__.py
│   │   ├── create_order.py
│   │   ├── cancel_order.py
│   │   ├── create_gift.py
│   │   └── activate_gift.py
│   ├── queries/                   # Queries
│   │   ├── __init__.py
│   │   ├── get_order.py
│   │   ├── list_orders.py
│   │   └── list_dishes.py
│   └── dto/                       # Data Transfer Objects
│       ├── __init__.py
│       ├── order_dto.py
│       ├── gift_dto.py
│       └── payment_dto.py
│
├── infrastructure/                 # Infrastructure Layer
│   ├── __init__.py
│   ├── persistence/               # Data Access
│   │   ├── __init__.py
│   │   ├── models.py              # Django Models
│   │   ├── repositories/          # Repository Implementations
│   │   │   ├── __init__.py
│   │   │   ├── order_repository_impl.py
│   │   │   ├── producer_repository_impl.py
│   │   │   └── gift_repository_impl.py
│   │   └── migrations/
│   ├── external/                  # External Services
│   │   ├── __init__.py
│   │   ├── payment_providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── tinkoff.py
│   │   │   ├── dev_fake.py
│   │   │   └── factory.py
│   │   └── moderation/
│   │       ├── __init__.py
│   │       ├── base_moderator.py
│   │       ├── rules_moderator.py
│   │       ├── profanity_moderator.py
│   │       ├── ai_moderator.py
│   │       └── shop_name_moderator.py
│   └── cache/                     # Cache Layer
│       ├── __init__.py
│       └── cache_service.py
│
├── api/                           # Presentation Layer
│   ├── __init__.py
│   ├── views/                     # API Views
│   │   ├── __init__.py
│   │   ├── producer_views.py
│   │   ├── dish_views.py
│   │   ├── order_views.py
│   │   └── gift_views.py
│   ├── serializers/               # Serializers
│   │   ├── __init__.py
│   │   ├── producer_serializers.py
│   │   ├── dish_serializers.py
│   │   ├── order_serializers.py
│   │   └── gift_serializers.py
│   ├── permissions/               # Custom Permissions
│   │   ├── __init__.py
│   │   └── order_permissions.py
│   ├── filters/                   # Custom Filters
│   │   ├── __init__.py
│   │   └── order_filters.py
│   └── urls.py
│
├── tests/                         # Tests
│   ├── __init__.py
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_entities/
│   │   ├── test_value_objects/
│   │   ├── test_repositories/
│   │   └── test_services/
│   ├── integration/
│   │   ├── __init__.py
│   │   ├── test_api_endpoints.py
│   │   └── test_workflows.py
│   └── e2e/
│       ├── __init__.py
│       └── test_user_journeys.py
│
└── config/                        # Configuration
    ├── __init__.py
    ├── settings/
    │   ├── __init__.py
    │   ├── base.py
    │   ├── development.py
    │   ├── staging.py
    │   └── production.py
    └── urls.py
```

---

## 1. Core Layer - Исключения и Логирование

### 1.1 Custom Exceptions

```python
# backend/core/exceptions.py
"""
Централизованная система исключений для приложения.
Все пользовательские исключения должны наследоваться от BaseAppException.
"""

from typing import Optional, Dict, Any
from http import HTTPStatus


class BaseAppException(Exception):
    """Базовый класс для всех исключений приложения."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразовать исключение в словарь для API ответа."""
        return {
            "success": False,
            "error": self.message,
            "error_code": self.error_code,
            "details": self.details
        }


# Domain Exceptions
class DomainException(BaseAppException):
    """Базовый класс для исключений доменной области."""
    status_code = HTTPStatus.BAD_REQUEST


class ValidationException(DomainException):
    """Исключение при ошибке валидации."""
    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details
        )


class BusinessRuleException(DomainException):
    """Исключение при нарушении бизнес-правила."""
    def __init__(self, message: str, rule_name: Optional[str] = None):
        details = {"rule": rule_name} if rule_name else {}
        super().__init__(
            message=message,
            error_code="BUSINESS_RULE_VIOLATION",
            details=details
        )


class NotFoundException(DomainException):
    """Исключение когда ресурс не найден."""
    status_code = HTTPStatus.NOT_FOUND
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} with id '{resource_id}' not found",
            error_code="NOT_FOUND",
            details={"resource_type": resource_type, "resource_id": resource_id}
        )


class PermissionException(DomainException):
    """Исключение при недостатке прав."""
    status_code = HTTPStatus.FORBIDDEN
    
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            error_code="PERMISSION_DENIED"
        )


class ConflictException(DomainException):
    """Исключение при конфликте данных."""
    status_code = HTTPStatus.CONFLICT
    
    def __init__(self, message: str, conflict_type: Optional[str] = None):
        details = {"conflict_type": conflict_type} if conflict_type else {}
        super().__init__(
            message=message,
            error_code="CONFLICT",
            details=details
        )


# Infrastructure Exceptions
class InfrastructureException(BaseAppException):
    """Базовый класс для исключений инфраструктуры."""
    status_code = HTTPStatus.INTERNAL_SERVER_ERROR


class PaymentException(InfrastructureException):
    """Исключение при ошибке платежа."""
    def __init__(self, message: str, provider: Optional[str] = None):
        details = {"provider": provider} if provider else {}
        super().__init__(
            message=message,
            error_code="PAYMENT_ERROR",
            details=details
        )


class ExternalServiceException(InfrastructureException):
    """Исключение при ошибке внешнего сервиса."""
    def __init__(self, service_name: str, message: str):
        super().__init__(
            message=f"{service_name} error: {message}",
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service_name}
        )
```

### 1.2 Structured Logging

```python
# backend/core/logging.py
"""
Структурированное логирование для приложения.
Использует JSON формат для удобства парсинга и анализа.
"""

import logging
import json
import time
from contextvars import ContextVar
from typing import Any, Dict, Optional
from datetime import datetime
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
    
    # Создаем handler для stdout
    handler = logging.StreamHandler()
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
```

### 1.3 Constants

```python
# backend/core/constants.py
"""
Константы приложения.
Все magic numbers и strings должны быть вынесены сюда.
"""

from decimal import Decimal


# Order Statuses
class OrderStatus:
    WAITING_FOR_PAYMENT = "WAITING_FOR_PAYMENT"
    WAITING_FOR_RECIPIENT = "WAITING_FOR_RECIPIENT"
    WAITING_FOR_ACCEPTANCE = "WAITING_FOR_ACCEPTANCE"
    COOKING = "COOKING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    READY_FOR_DELIVERY = "READY_FOR_DELIVERY"
    DELIVERING = "DELIVERING"
    ARRIVED = "ARRIVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTE = "DISPUTE"
    
    # Terminal statuses
    TERMINAL_STATUSES = [COMPLETED, CANCELLED, DISPUTE]
    
    # Transitions that allow cancellation by buyer
    BUYER_CANCELLABLE_STATUSES = [
        WAITING_FOR_PAYMENT,
        WAITING_FOR_RECIPIENT,
        WAITING_FOR_ACCEPTANCE
    ]


# Producer Constants
class ProducerConstants:
    MAX_CONSECUTIVE_REJECTIONS = 3
    PENALTY_POINTS_PER_REJECTION = 1
    RATING_DECREMENT = 1
    RATING_INCREMENT = 1
    MAX_RATING = 5.0
    MIN_RATING = 0.0
    
    # Commission rates
    SELF_EMPLOYED_COMMISSION = Decimal("0.05")  # 5%
    INDIVIDUAL_ENTREPRENEUR_COMMISSION = Decimal("0.10")  # 10%
    
    # Delivery
    DEFAULT_DELIVERY_RADIUS_KM = Decimal("10.0")
    DEFAULT_DELIVERY_TIME_MINUTES = 60


# Order Constants
class OrderConstants:
    ACCEPTANCE_DEADLINE_MINUTES_URGENT = 30
    ACCEPTANCE_DEADLINE_MINUTES_NORMAL = 60
    LATE_DELIVERY_THRESHOLD_MINUTES = 30
    MAX_QUANTITY_PER_ORDER = 100
    MIN_QUANTITY_PER_ORDER = 1
    
    # Delivery types
    DELIVERY_TYPE_BUILDING = "BUILDING"
    DELIVERY_TYPE_DOOR = "DOOR"
    
    # Cancellation compensation
    BUYER_CANCELLATION_COMPENSATION_PERCENT = Decimal("0.10")  # 10%


# Gift Constants
class GiftConstants:
    ACTIVATION_TOKEN_LENGTH = 128
    GIFT_CODE_LENGTH = 10
    DEFAULT_VALIDITY_DAYS = 30
    MAX_ACTIVATION_ATTEMPTS = 5


# Payment Constants
class PaymentConstants:
    DEFAULT_CURRENCY = "RUB"
    MAX_REFUND_ATTEMPTS = 3
    REFUND_TIMEOUT_SECONDS = 30


# Moderation Constants
class ModerationConstants:
    SHOP_NAME_MIN_LENGTH = 2
    SHOP_NAME_MAX_LENGTH = 60
    MAX_CAPS_RATIO = 0.75
    OLLAMA_TIMEOUT_SECONDS = 12
    OLLAMA_GUARD_MODEL = "llama-guard3"
    
    # Profanity list (can be moved to separate file or database)
    BANNED_WORDS = [
        'хуй', 'хуе', 'хуя', 'пизд', 'бля', 'сука', 'сучк',
        'пидор', 'пидар', 'мудак', 'гандон', 'шлюх', 'залуп',
        'дроч', 'ебан', 'ебат', 'ебл', 'ебн', 'ебуч',
    ]


# Cache Constants
class CacheConstants:
    CATEGORIES_LIST_TIMEOUT = 3600  # 1 hour
    DISH_DETAIL_TIMEOUT = 300  # 5 minutes
    PRODUCER_DETAIL_TIMEOUT = 300  # 5 minutes
    USER_ORDERS_TIMEOUT = 60  # 1 minute


# API Constants
class APIConstants:
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # Rate limiting
    ANON_RATE_LIMIT = "100/hour"
    USER_RATE_LIMIT = "1000/hour"
    GIFT_TOKEN_RATE_LIMIT = "30/min"
    GIFT_TOKEN_IP_RATE_LIMIT = "10/min"
    GIFT_NOTIFY_RATE_LIMIT = "5/hour"
```

### 1.4 Validators

```python
# backend/core/validators.py
"""
Валидаторы для полей моделей и сериализаторов.
"""

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
import re


class MoneyValidator:
    """Валидатор для денежных значений."""
    
    def __init__(self, min_value: Decimal = Decimal("0.01"), max_value: Decimal = None):
        self.min_value = min_value
        self.max_value = max_value
    
    def __call__(self, value: Decimal):
        if value < self.min_value:
            raise ValidationError(
                _("Value must be at least %(min_value)s"),
                params={"min_value": self.min_value}
            )
        
        if self.max_value is not None and value > self.max_value:
            raise ValidationError(
                _("Value must be at most %(max_value)s"),
                params={"max_value": self.max_value}
            )


class PhoneNumberValidator:
    """Валидатор для телефонных номеров (Россия)."""
    
    def __call__(self, value: str):
        # Удаляем все нецифровые символы
        cleaned = re.sub(r'[^\d]', '', value)
        
        # Проверяем длину (для России: 11 цифр с кодом страны)
        if len(cleaned) != 11:
            raise ValidationError(
                _("Phone number must contain 11 digits for Russian numbers")
            )
        
        # Проверяем код страны
        if not cleaned.startswith(('7', '8')):
            raise ValidationError(
                _("Phone number must start with 7 or 8 for Russian numbers")
            )


class JSONSchemaValidator:
    """Валидатор для JSON полей по схеме."""
    
    def __init__(self, schema: dict):
        self.schema = schema
    
    def __call__(self, value):
        if not isinstance(value, dict):
            raise ValidationError(_("Value must be a dictionary"))
        
        for key, key_schema in self.schema.items():
            if key not in value:
                if key_schema.get('required', False):
                    raise ValidationError(
                        _("Missing required field: %(field)s"),
                        params={"field": key}
                    )
                continue
            
            field_value = value[key]
            expected_type = key_schema.get('type')
            
            if expected_type and not isinstance(field_value, expected_type):
                raise ValidationError(
                    _("Field '%(field)s' must be of type %(type)s"),
                    params={"field": key, "type": expected_type.__name__}
                )


class WeeklyScheduleValidator(JSONSchemaValidator):
    """Валидатор для weekly_schedule."""
    
    SCHEDULE_SCHEMA = {
        'day': {'type': str, 'required': True},
        'start': {'type': str, 'required': True},
        'end': {'type': str, 'required': True},
        'is_closed': {'type': bool, 'required': False},
    }
    
    def __init__(self):
        super().__init__(self.SCHEDULE_SCHEMA)
    
    def __call__(self, value):
        if not isinstance(value, list):
            raise ValidationError(_("Weekly schedule must be a list"))
        
        for day_schedule in value:
            super().__call__(day_schedule)
            
            # Проверяем формат времени
            time_fields = ['start', 'end']
            for field in time_fields:
                if field in day_schedule:
                    if not re.match(r'^\d{2}:\d{2}$', day_schedule[field]):
                        raise ValidationError(
                            _("Field '%(field)s' must be in HH:MM format"),
                            params={"field": field}
                        )
```

### 1.5 Unified Response Format

```python
# backend/core/responses.py
"""
Унифицированный формат ответов API.
"""

from typing import Any, Dict, List, Optional
from rest_framework.response import Response
from rest_framework import status


class APIResponse:
    """Класс для создания унифицированных API ответов."""
    
    @staticmethod
    def success(
        data: Any = None,
        message: Optional[str] = None,
        status_code: int = status.HTTP_200_OK
    ) -> Response:
        """Создать успешный ответ."""
        response_data = {
            "success": True,
            "data": data,
        }
        
        if message:
            response_data["message"] = message
        
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(
        message: str,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST
    ) -> Response:
        """Создать ответ с ошибкой."""
        response_data = {
            "success": False,
            "error": message,
            "error_code": error_code,
        }
        
        if details:
            response_data["details"] = details
        
        return Response(response_data, status=status_code)
    
    @staticmethod
    def validation_error(
        errors: Dict[str, List[str]],
        message: str = "Validation error"
    ) -> Response:
        """Создать ответ с ошибкой валидации."""
        return APIResponse.error(
            message=message,
            error_code="VALIDATION_ERROR",
            details={"errors": errors},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    
    @staticmethod
    def not_found(
        resource_type: str,
        resource_id: str
    ) -> Response:
        """Создать ответ для не найденного ресурса."""
        return APIResponse.error(
            message=f"{resource_type} with id '{resource_id}' not found",
            error_code="NOT_FOUND",
            details={"resource_type": resource_type, "resource_id": resource_id},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def paginated(
        data: List[Any],
        count: int,
        next_url: Optional[str] = None,
        previous_url: Optional[str] = None
    ) -> Response:
        """Создать пагинированный ответ."""
        response_data = {
            "success": True,
            "data": data,
            "pagination": {
                "count": count,
                "next": next_url,
                "previous": previous_url,
            }
        }
        return Response(response_data)
```

---

## 2. Domain Layer - Entities and Value Objects

### 2.1 Value Object: Money

```python
# backend/domain/value_objects/money.py
"""
Value Object для денежных значений.
Обеспечивает корректную работу с деньгами.
"""

from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class Money:
    """Value Object для представления денег."""
    amount: Decimal
    currency: str = "RUB"
    
    def __post_init__(self):
        """Валидация после инициализации."""
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        
        if not isinstance(self.amount, Decimal):
            raise ValueError("Amount must be Decimal")
        
        # Округляем до 2 знаков
        object.__setattr__(self, 'amount', self.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    def __add__(self, other: 'Money') -> 'Money':
        """Сложить два значения Money."""
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)
    
    def __sub__(self, other: 'Money') -> 'Money':
        """Вычесть два значения Money."""
        if self.currency != other.currency:
            raise ValueError("Cannot subtract different currencies")
        result = self.amount - other.amount
        if result < 0:
            raise ValueError("Result cannot be negative")
        return Money(result, self.currency)
    
    def __mul__(self, multiplier: Union[int, float, Decimal]) -> 'Money':
        """Умножить на число."""
        result = self.amount * Decimal(str(multiplier))
        return Money(result, self.currency)
    
    def __truediv__(self, divisor: Union[int, float, Decimal]) -> 'Money':
        """Разделить на число."""
        if divisor == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        result = self.amount / Decimal(str(divisor))
        return Money(result, self.currency)
    
    def __eq__(self, other: object) -> bool:
        """Сравнить на равенство."""
        if not isinstance(other, Money):
            return False
        return self.amount == other.amount and self.currency == other.currency
    
    def __lt__(self, other: 'Money') -> bool:
        """Сравнить меньше."""
        if self.currency != other.currency:
            raise ValueError("Cannot compare different currencies")
        return self.amount < other.amount
    
    def __gt__(self, other: 'Money') -> bool:
        """Сравнить больше."""
        if self.currency != other.currency:
            raise ValueError("Cannot compare different currencies")
        return self.amount > other.amount
    
    def __str__(self) -> str:
        """Строковое представление."""
        return f"{self.amount} {self.currency}"
    
    def to_dict(self) -> dict:
        """Преобразовать в словарь."""
        return {
            "amount": float(self.amount),
            "currency": self.currency
        }
    
    @classmethod
    def zero(cls, currency: str = "RUB") -> 'Money':
        """Создать Money с нулевым значением."""
        return Money(Decimal("0.00"), currency)
```

### 2.2 Value Object: DeliveryAddress

```python
# backend/domain/value_objects/delivery_address.py
"""
Value Object для адреса доставки.
"""

from dataclasses import dataclass
from typing import Optional
from decimal import Decimal


@dataclass(frozen=True)
class DeliveryAddress:
    """Value Object для адреса доставки."""
    address_text: str
    apartment: Optional[str] = None
    entrance: Optional[str] = None
    floor: Optional[str] = None
    intercom: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    delivery_comment: Optional[str] = None
    
    def __post_init__(self):
        """Валидация после инициализации."""
        if not self.address_text or not self.address_text.strip():
            raise ValueError("Address text is required")
        
        # Валидация координат
        if self.latitude is not None:
            if not (-90 <= float(self.latitude) <= 90):
                raise ValueError("Latitude must be between -90 and 90")
        
        if self.longitude is not None:
            if not (-180 <= float(self.longitude) <= 180):
                raise ValueError("Longitude must be between -180 and 180")
    
    def has_coordinates(self) -> bool:
        """Проверить наличие координат."""
        return self.latitude is not None and self.longitude is not None
    
    def to_dict(self) -> dict:
        """Преобразовать в словарь."""
        return {
            "address_text": self.address_text,
            "apartment": self.apartment,
            "entrance": self.entrance,
            "floor": self.floor,
            "intercom": self.intercom,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "delivery_comment": self.delivery_comment,
        }
```

### 2.3 Repository Interface: OrderRepository

```python
# backend/domain/repositories/order_repository.py
"""
Интерфейс репозитория для работы с заказами.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class OrderRepository(ABC):
    """Интерфейс репозитория заказов."""
    
    @abstractmethod
    def get_by_id(self, order_id: UUID) -> Optional['Order']:
        """Получить заказ по ID."""
        pass
    
    @abstractmethod
    def get_by_user(
        self, 
        user_id: UUID, 
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List['Order']:
        """Получить заказы пользователя."""
        pass
    
    @abstractmethod
    def get_by_producer(
        self, 
        producer_id: UUID, 
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List['Order']:
        """Получить заказы производителя."""
        pass
    
    @abstractmethod
    def create(self, order: 'Order') -> 'Order':
        """Создать заказ."""
        pass
    
    @abstractmethod
    def update(self, order: 'Order') -> 'Order':
        """Обновить заказ."""
        pass
    
    @abstractmethod
    def delete(self, order_id: UUID) -> bool:
        """Удалить заказ."""
        pass
    
    @abstractmethod
    def count_by_status(self, status: str) -> int:
        """Подсчитать заказы по статусу."""
        pass
    
    @abstractmethod
    def get_expired_acceptance_deadlines(self, limit: int = 100) -> List['Order']:
        """Получить заказы с истекшим дедлайном принятия."""
        pass
    
    @abstractmethod
    def lock_for_update(self, order_id: UUID) -> Optional['Order']:
        """Заблокировать заказ для обновления (SELECT FOR UPDATE)."""
        pass
```

---

## 3. Infrastructure Layer - Repository Implementations

### 3.1 OrderRepository Implementation

```python
# backend/infrastructure/persistence/repositories/order_repository_impl.py
"""
Реализация репозитория заказов.
"""

from typing import List, Optional
from uuid import UUID
from django.db import transaction
from django.db.models import Q, Count, Sum

from domain.repositories.order_repository import OrderRepository
from infrastructure.persistence.models import Order as OrderModel
from core.exceptions import NotFoundException
from core.logging import get_logger


logger = get_logger(__name__)


class OrderRepositoryImpl(OrderRepository):
    """Реализация репозитория заказов."""
    
    def get_by_id(self, order_id: UUID) -> Optional[OrderModel]:
        """Получить заказ по ID с оптимизацией запросов."""
        try:
            return OrderModel.objects.select_related(
                'user',
                'dish__producer',
                'applied_promo_code',
                'current_payment'
            ).prefetch_related(
                'dish__images',
                'disputes'
            ).get(id=order_id)
        except OrderModel.DoesNotExist:
            logger.warning(
                'order_not_found',
                order_id=str(order_id)
            )
            return None
    
    def get_by_user(
        self, 
        user_id: UUID, 
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[OrderModel]:
        """Получить заказы пользователя."""
        queryset = OrderModel.objects.filter(user_id=user_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset.select_related(
            'dish__producer'
        ).order_by('-created_at')[offset:offset + limit]
    
    def get_by_producer(
        self, 
        producer_id: UUID, 
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[OrderModel]:
        """Получить заказы производителя."""
        queryset = OrderModel.objects.filter(dish__producer_id=producer_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset.select_related(
            'user',
            'dish'
        ).order_by('-created_at')[offset:offset + limit]
    
    @transaction.atomic
    def create(self, order: OrderModel) -> OrderModel:
        """Создать заказ."""
        logger.info(
            'order_creating',
            user_id=str(order.user_id),
            dish_id=str(order.dish_id),
            total_price=float(order.total_price)
        )
        
        order.save()
        
        logger.info(
            'order_created',
            order_id=str(order.id),
            user_id=str(order.user_id)
        )
        
        return order
    
    @transaction.atomic
    def update(self, order: OrderModel) -> OrderModel:
        """Обновить заказ."""
        logger.info(
            'order_updating',
            order_id=str(order.id),
            status=order.status
        )
        
        order.save()
        
        logger.info(
            'order_updated',
            order_id=str(order.id)
        )
        
        return order
    
    @transaction.atomic
    def delete(self, order_id: UUID) -> bool:
        """Удалить заказ."""
        try:
            order = OrderModel.objects.get(id=order_id)
            order.delete()
            
            logger.info(
                'order_deleted',
                order_id=str(order_id)
            )
            
            return True
        except OrderModel.DoesNotExist:
            logger.warning(
                'order_not_found_for_deletion',
                order_id=str(order_id)
            )
            return False
    
    def count_by_status(self, status: str) -> int:
        """Подсчитать заказы по статусу."""
        return OrderModel.objects.filter(status=status).count()
    
    def get_expired_acceptance_deadlines(self, limit: int = 100) -> List[OrderModel]:
        """Получить заказы с истекшим дедлайном принятия."""
        from django.utils import timezone
        
        return OrderModel.objects.filter(
            status='WAITING_FOR_ACCEPTANCE',
            acceptance_deadline__lt=timezone.now()
        ).select_for_update().order_by('acceptance_deadline')[:limit]
    
    def lock_for_update(self, order_id: UUID) -> Optional[OrderModel]:
        """Заблокировать заказ для обновления."""
        try:
            return OrderModel.objects.select_for_update().select_related(
                'dish__producer',
                'user'
            ).get(id=order_id)
        except OrderModel.DoesNotExist:
            logger.warning(
                'order_not_found_for_lock',
                order_id=str(order_id)
            )
            return None
```

---

## 4. Application Layer - Services

### 4.1 Payment Service (Refactored)

```python
# backend/application/services/payment_service.py
"""
Сервис для обработки платежей.
Рефакторинг с использованием паттерна Factory и DI.
"""

from dataclasses import dataclass
from typing import Optional, Protocol
from decimal import Decimal

from core.exceptions import (
    PaymentException,
    BusinessRuleException,
    NotFoundException
)
from core.logging import get_logger
from core.constants import PaymentConstants
from domain.value_objects.money import Money
from domain.repositories.order_repository import OrderRepository
from infrastructure.external.payment_providers.base import BasePaymentProvider
from infrastructure.external.payment_providers.factory import PaymentProviderFactory


logger = get_logger(__name__)


class PaymentServiceDependencies(Protocol):
    """Зависимости для PaymentService."""
    
    order_repository: OrderRepository
    payment_provider_factory: PaymentProviderFactory


@dataclass
class PaymentResult:
    """Результат инициации платежа."""
    payment_id: str
    payment_url: str
    amount: Money


class PaymentService:
    """Сервис для обработки платежей."""
    
    def __init__(self, deps: PaymentServiceDependencies):
        self.deps = deps
        self.order_repo = deps.order_repository
        self.provider_factory = deps.payment_provider_factory
    
    def init_payment(
        self,
        order_id: str,
        return_url: str,
        provider_type: Optional[str] = None
    ) -> PaymentResult:
        """
        Инициализировать платеж для заказа.
        
        Args:
            order_id: ID заказа
            return_url: URL для возврата после оплаты
            provider_type: Тип провайдера платежей (опционально)
        
        Returns:
            PaymentResult с информацией о платеже
        
        Raises:
            BusinessRuleException: Если заказ не в статусе ожидания оплаты
            NotFoundException: Если заказ не найден
            PaymentException: При ошибке инициации платежа
        """
        from uuid import UUID
        
        # Получаем заказ
        order = self.order_repo.get_by_id(UUID(order_id))
        if not order:
            raise NotFoundException("Order", order_id)
        
        # Проверяем статус заказа
        if order.status != 'WAITING_FOR_PAYMENT':
            logger.warning(
                'payment_init_invalid_status',
                order_id=order_id,
                current_status=order.status
            )
            raise BusinessRuleException(
                message="Order is not in payment state",
                rule_name="payment_init_status_check"
            )
        
        # Получаем провайдер платежей
        provider = self.provider_factory.create(provider_type)
        
        # Создаем платеж
        try:
            payment = self._create_payment(order, provider)
            provider_result = provider.init_payment(
                payment_id=str(payment.id),
                amount=float(order.total_price),
                description=f"Order {order.id}",
                return_url=return_url
            )
            
            # Обновляем платеж
            payment.provider_payment_id = provider_result["provider_payment_id"]
            payment.provider_raw_response = provider_result.get("raw") or {}
            payment.status = "PENDING"
            payment.save(update_fields=["provider_payment_id", "provider_raw_response", "status"])
            
            # Обновляем заказ
            order.current_payment = payment
            order.tinkoff_payment_id = payment.provider_payment_id
            order.save(update_fields=["current_payment", "tinkoff_payment_id"])
            
            logger.info(
                'payment_initiated',
                order_id=str(order.id),
                payment_id=str(payment.id),
                provider=provider_type,
                amount=float(order.total_price)
            )
            
            return PaymentResult(
                payment_id=str(payment.id),
                payment_url=provider_result["payment_url"],
                amount=Money(Decimal(str(order.total_price)), PaymentConstants.DEFAULT_CURRENCY)
            )
            
        except Exception as e:
            logger.error(
                'payment_init_error',
                order_id=str(order.id),
                error=str(e)
            )
            raise PaymentException(
                message=f"Failed to initiate payment: {str(e)}",
                provider=provider_type
            )
    
    def _create_payment(
        self,
        order: 'OrderModel',
        provider: BasePaymentProvider
    ) -> 'PaymentModel':
        """Создать запись о платеже."""
        from infrastructure.persistence.models import Payment
        
        return Payment.objects.create(
            order=order,
            amount=order.total_price,
            currency=PaymentConstants.DEFAULT_CURRENCY,
            provider=provider.provider_type,
            status="INITIATED",
        )
    
    def simulate_payment_success(self, payment_id: str) -> None:
        """
        Симулировать успешный платеж (для разработки).
        
        Args:
            payment_id: ID платежа
        """
        from uuid import UUID
        from django.utils import timezone
        from infrastructure.persistence.models import Payment
        
        try:
            payment = Payment.objects.select_for_update().get(id=UUID(payment_id))
        except Payment.DoesNotExist:
            raise NotFoundException("Payment", payment_id)
        
        if payment.status in ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"]:
            logger.info(
                'payment_already_succeeded',
                payment_id=payment_id,
                status=payment.status
            )
            return
        
        payment.status = "SUCCEEDED"
        payment.paid_at = timezone.now()
        payment.save(update_fields=["status", "paid_at"])
        
        logger.info(
            'payment_succeeded',
            payment_id=payment_id,
            order_id=str(payment.order_id)
        )
    
    def refund_payment(
        self,
        payment_id: str,
        amount: Decimal
    ) -> None:
        """
        Выполнить возврат платежа.
        
        Args:
            payment_id: ID платежа
            amount: Сумма возврата
        
        Raises:
            BusinessRuleException: Если платеж не в статусе для возврата
            PaymentException: При ошибке возврата
        """
        from uuid import UUID
        from django.utils import timezone
        from infrastructure.persistence.models import Payment
        
        try:
            payment = Payment.objects.select_for_update().get(id=UUID(payment_id))
        except Payment.DoesNotExist:
            raise NotFoundException("Payment", payment_id)
        
        if payment.status not in ["SUCCEEDED", "PARTIALLY_REFUNDED"]:
            raise BusinessRuleException(
                message="Payment is not in refundable state",
                rule_name="payment_refund_status_check"
            )
        
        # Проверяем сумму возврата
        if amount > (payment.amount - payment.refunded_amount):
            raise BusinessRuleException(
                message="Refund amount exceeds available amount",
                rule_name="payment_refund_amount_check"
            )
        
        # Выполняем возврат через провайдер
        if payment.provider_payment_id:
            provider = self.provider_factory.create(payment.provider)
            provider_result = provider.refund(payment.provider_payment_id, amount)
        else:
            provider_result = {"refunded_amount": str(amount)}
        
        # Обновляем платеж
        payment.refunded_amount += amount
        payment.refunded_at = timezone.now()
        
        if payment.refunded_amount >= payment.amount:
            payment.status = "REFUNDED"
        else:
            payment.status = "PARTIALLY_REFUNDED"
        
        raw = dict(payment.provider_raw_response or {})
        raw["last_refund"] = provider_result
        payment.provider_raw_response = raw
        
        payment.save(
            update_fields=[
                "refunded_amount",
                "refunded_at",
                "status",
                "provider_raw_response"
            ]
        )
        
        logger.info(
            'payment_refunded',
            payment_id=payment_id,
            amount=float(amount),
            status=payment.status
        )
```

### 4.2 Moderation Service (Refactored)

```python
# backend/application/services/moderation_service.py
"""
Сервис для модерации контента.
Рефакторинг с использованием Chain of Responsibility.
"""

from dataclasses import dataclass
from typing import List, Protocol

from core.exceptions import ValidationException
from core.logging import get_logger
from core.constants import ModerationConstants
from infrastructure.external.moderation.base_moderator import BaseModerator
from infrastructure.external.moderation.rules_moderator import RulesModerator
from infrastructure.external.moderation.profanity_moderator import ProfanityModerator
from infrastructure.external.moderation.ai_moderator import AIModerator


logger = get_logger(__name__)


@dataclass
class ModerationResult:
    """Результат модерации."""
    is_approved: bool
    reason: str
    details: dict = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}


class ModerationService:
    """Сервис для модерации контента."""
    
    def __init__(self):
        self.moderators: List[BaseModerator] = [
            RulesModerator(),
            ProfanityModerator(),
            AIModerator()
        ]
    
    def moderate_shop_name(self, shop_name: str) -> ModerationResult:
        """
        Проверить название магазина на соответствие правилам.
        
        Args:
            shop_name: Название магазина для проверки
        
        Returns:
            ModerationResult с результатом проверки
        """
        logger.info(
            'shop_name_moderation_started',
            shop_name=shop_name
        )
        
        # Применяем цепочку модераторов
        for moderator in self.moderators:
            try:
                result = moderator.moderate(shop_name)
                
                if not result.is_approved:
                    logger.warning(
                        'shop_name_rejected',
                        shop_name=shop_name,
                        reason=result.reason,
                        moderator=moderator.__class__.__name__
                    )
                    
                    return ModerationResult(
                        is_approved=False,
                        reason=result.reason,
                        details={"moderator": moderator.__class__.__name__}
                    )
                    
            except Exception as e:
                logger.error(
                    'moderator_error',
                    moderator=moderator.__class__.__name__,
                    error=str(e)
                )
                # Продолжаем со следующим модератором
        
        # Все проверки пройдены
        logger.info(
            'shop_name_approved',
            shop_name=shop_name
        )
        
        return ModerationResult(
            is_approved=True,
            reason="all_checks_passed"
        )
    
    def sanitize_shop_text(self, text: str, max_len: int = 500) -> str:
        """
        Очистить текст магазина от запрещенного контента.
        
        Args:
            text: Исходный текст
            max_len: Максимальная длина
        
        Returns:
            Очищенный текст
        """
        import re
        
        # Удаляем ссылки
        text = re.sub(r'https?://\S+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bwww\.\S+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bt\.me/\S+', '', text, flags=re.IGNORECASE)
        
        # Удаляем email
        text = re.sub(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', '', text, flags=re.IGNORECASE)
        
        # Удаляем телефоны
        text = re.sub(r'\+?\d[\d\s\-\(\)]{8,}\d', '', text)
        
        # Удаляем соцсети
        text = re.sub(r'(@|#)\w+', '', text)
        
        # Удаляем эмодзи
        text = re.sub(r'[\U0001F300-\U0001FAFF]', '', text)
        
        # Удаляем названия соцсетей
        text = re.sub(
            r'\b(?:telegram|телеграм|whatsapp|ватсап|viber|вайбер|instagram|инстаграм|vk|вк|facebook|фейсбук)\b',
            '',
            text,
            flags=re.IGNORECASE
        )
        
        # Удаляем лишние пробелы
        text = re.sub(r'\s{2,}', ' ', text).strip()
        
        # Обрезаем до максимальной длины
        if max_len and len(text) > max_len:
            text = text[:max_len].rstrip()
        
        return text
```

---

## 5. Presentation Layer - Views

### 5.1 Order Views (Refactored)

```python
# backend/api/views/order_views.py
"""
Views для работы с заказами.
Рефакторинг с использованием thin controllers.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from core.responses import APIResponse
from core.exceptions import BaseAppException
from core.logging import get_logger, trace_id_var, user_id_var
from application.services.order_service import OrderService
from application.services.payment_service import PaymentService
from api.serializers.order_serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
    PaymentInitSerializer,
)


logger = get_logger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с заказами."""
    
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Dependency injection через контейнер (можно использовать django-injector)
        from infrastructure.di.container import DIContainer
        
        container = DIContainer()
        self.order_service = container.get_order_service()
        self.payment_service = container.get_payment_service()
    
    def get_queryset(self):
        """Получить queryset для текущего пользователя."""
        return self.order_service.get_user_orders(
            user_id=self.request.user.id,
            status=self.request.query_params.get('status')
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Получить детали заказа."""
        try:
            order = self.order_service.get_order_by_id(kwargs['pk'])
            serializer = self.get_serializer(order)
            return APIResponse.success(data=serializer.data)
        except BaseAppException as e:
            return APIResponse.error(
                message=e.message,
                error_code=e.error_code,
                details=e.details,
                status_code=e.status_code
            )
    
    def create(self, request, *args, **kwargs):
        """Создать заказ."""
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            order = self.order_service.create_order(
                user=request.user,
                **serializer.validated_data
            )
            response_serializer = OrderSerializer(order)
            return APIResponse.success(
                data=response_serializer.data,
                message="Order created successfully",
                status_code=status.HTTP_201_CREATED
            )
        except BaseAppException as e:
            return APIResponse.error(
                message=e.message,
                error_code=e.error_code,
                details=e.details,
                status_code=e.status_code
            )
    
    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Инициализировать платеж для заказа."""
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = self.payment_service.init_payment(
                order_id=pk,
                return_url=serializer.validated_data['return_url'],
                provider_type=serializer.validated_data.get('provider_type')
            )
            
            return APIResponse.success(
                data={
                    "payment_id": result.payment_id,
                    "payment_url": result.payment_url,
                    "amount": result.amount.to_dict()
                },
                message="Payment initiated successfully"
            )
        except BaseAppException as e:
            return APIResponse.error(
                message=e.message,
                error_code=e.error_code,
                details=e.details,
                status_code=e.status_code
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Отменить заказ."""
        reason = request.data.get('reason', '')
        
        try:
            self.order_service.cancel_order(
                order_id=pk,
                user=request.user,
                reason=reason
            )
            
            return APIResponse.success(
                message="Order cancelled successfully"
            )
        except BaseAppException as e:
            return APIResponse.error(
                message=e.message,
                error_code=e.error_code,
                details=e.details,
                status_code=e.status_code
            )
```

---

## 6. Global Exception Handler

```python
# backend/core/exceptions_handler.py
"""
Глобальный обработчик исключений для REST API.
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db import DatabaseError
from django.core.exceptions import ValidationError

from core.exceptions import BaseAppException
from core.logging import get_logger, trace_id_var, user_id_var


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
                "details": {"errors": exc.message_dict if hasattr(exc, 'message_dict') else str(exc)}
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
        response.data = {
            "success": False,
            "error": str(exc),
            "error_code": "DRF_ERROR",
            "details": response.data
        }
    
    return response
```

---

## 7. Settings Configuration

### 7.1 Base Settings (Refactored)

```python
# backend/config/settings/base.py
"""
Базовые настройки Django.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Security
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY environment variable is required")

DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',')

# Application
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    
    # Local
    'infrastructure.persistence',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Auth
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
    'EXCEPTION_HANDLER': 'core.exceptions_handler.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# CORS
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'structured': {
            '()': 'core.logging.StructuredFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'structured',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'level': 'WARNING',
            'handlers': ['console'],
        },
        'rest_framework': {
            'level': 'INFO',
            'handlers': ['console'],
        },
    },
}

# API Documentation (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'HomeFood Marketplace API',
    'DESCRIPTION': 'API для маркетплейса домашней еды',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api',
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Email
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "465"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False") == "True"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "noreply@homefood.com")

# Payment Providers
DEFAULT_PAYMENT_PROVIDER = os.getenv('DEFAULT_PAYMENT_PROVIDER', 'DEV_FAKE')
TINKOFF_TERMINAL_KEY = os.getenv('TINKOFF_TERMINAL_KEY', '')
TINKOFF_SECRET_KEY = os.getenv('TINKOFF_SECRET_KEY', '')

# Moderation
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_GUARD_MODEL = os.getenv('OLLAMA_GUARD_MODEL', 'llama-guard3')
```

---

## 8. Middleware for Trace ID

```python
# backend/core/middleware.py
"""
Middleware для добавления trace_id в контекст.
"""

import uuid
from django.utils.deprecation import MiddlewareMixin
from core.logging import trace_id_var, user_id_var


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
```

---

## Итог

Этот документ содержит примеры оптимизированного кода для рефакторинга проекта. Основные улучшения:

1. **Четкое разделение слоев** - presentation, application, domain, infrastructure
2. **Использование Value Objects** - Money, DeliveryAddress
3. **Repository Pattern** - интерфейсы и реализации
4. **Dependency Injection** - через протоколы и dataclass
5. **Централизованная обработка исключений** - BaseAppException и custom handler
6. **Структурированное логирование** - JSON формат с trace_id
7. **Константы вместо magic numbers** - вынесены в отдельный модуль
8. **Валидаторы** - для полей моделей и JSONField
9. **Унифицированный формат ответов** - APIResponse класс
10. **Модерация с Chain of Responsibility** - отдельные модераторы
