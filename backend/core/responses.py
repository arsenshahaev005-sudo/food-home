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