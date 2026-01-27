"""
Централизованная система исключений для приложения.
Все пользовательские исключения должны наследоваться от BaseAppException.
"""

from http import HTTPStatus
from typing import Any, Dict, Optional


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