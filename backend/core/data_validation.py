"""
Улучшенная система валидации данных для приложения.
"""

from typing import Any, Dict, List, Optional, Union
from decimal import Decimal
import re
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator, validate_email
from .validators import MoneyValidator, PhoneNumberValidator


class DataValidator:
    """
    Универсальный класс для валидации данных.
    """
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        Валидировать email адрес.
        
        Args:
            email: Email адрес для валидации
            
        Returns:
            True если валидный, иначе ValidationError
        """
        try:
            validate_email(email)
            return True
        except ValidationError:
            raise ValidationError(f"'{email}' is not a valid email address")
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """
        Валидировать телефонный номер.
        
        Args:
            phone: Телефонный номер для валидации
            
        Returns:
            True если валидный, иначе ValidationError
        """
        validator = PhoneNumberValidator()
        validator(phone)
        return True
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """
        Валидировать URL.
        
        Args:
            url: URL для валидации
            
        Returns:
            True если валидный, иначе ValidationError
        """
        validator = URLValidator()
        validator(url)
        return True
    
    @staticmethod
    def validate_money(amount: Union[Decimal, float, str], min_value: Decimal = None, max_value: Decimal = None) -> bool:
        """
        Валидировать денежное значение.
        
        Args:
            amount: Денежное значение
            min_value: Минимальное значение
            max_value: Максимальное значение
            
        Returns:
            True если валидное, иначе ValidationError
        """
        if isinstance(amount, str):
            amount = Decimal(amount)
        elif isinstance(amount, float):
            amount = Decimal(str(amount))
        
        validator = MoneyValidator(min_value=min_value, max_value=max_value)
        validator(amount)
        return True
    
    @staticmethod
    def validate_positive_integer(value: int, min_value: int = 1, max_value: int = None) -> bool:
        """
        Валидировать положительное целое число.
        
        Args:
            value: Значение для валидации
            min_value: Минимальное значение
            max_value: Максимальное значение
            
        Returns:
            True если валидное, иначе ValidationError
        """
        if not isinstance(value, int):
            raise ValidationError(f"'{value}' is not an integer")
        
        if value < min_value:
            raise ValidationError(f"Value {value} is less than minimum {min_value}")
        
        if max_value is not None and value > max_value:
            raise ValidationError(f"Value {value} is greater than maximum {max_value}")
        
        return True
    
    @staticmethod
    def validate_decimal_range(
        value: Union[Decimal, float, str], 
        min_value: Union[Decimal, float] = None, 
        max_value: Union[Decimal, float] = None
    ) -> bool:
        """
        Валидировать десятичное значение в диапазоне.
        
        Args:
            value: Значение для валидации
            min_value: Минимальное значение
            max_value: Максимальное значение
            
        Returns:
            True если валидное, иначе ValidationError
        """
        if isinstance(value, str):
            value = Decimal(value)
        elif isinstance(value, float):
            value = Decimal(str(value))
        
        if min_value is not None and value < Decimal(str(min_value)):
            raise ValidationError(f"Value {value} is less than minimum {min_value}")
        
        if max_value is not None and value > Decimal(str(max_value)):
            raise ValidationError(f"Value {value} is greater than maximum {max_value}")
        
        return True
    
    @staticmethod
    def validate_string_length(
        value: str, 
        min_length: int = 0, 
        max_length: int = None, 
        allow_empty: bool = True
    ) -> bool:
        """
        Валидировать длину строки.
        
        Args:
            value: Строка для валидации
            min_length: Минимальная длина
            max_length: Максимальная длина
            allow_empty: Разрешить пустую строку
            
        Returns:
            True если валидная, иначе ValidationError
        """
        if not allow_empty and not value:
            raise ValidationError("String cannot be empty")
        
        if value is None:
            if allow_empty:
                return True
            else:
                raise ValidationError("Value cannot be None")
        
        if len(value) < min_length:
            raise ValidationError(f"String length {len(value)} is less than minimum {min_length}")
        
        if max_length is not None and len(value) > max_length:
            raise ValidationError(f"String length {len(value)} is greater than maximum {max_length}")
        
        return True
    
    @staticmethod
    def validate_choice(value: Any, choices: List[Any]) -> bool:
        """
        Валидировать значение на предмет его наличия в списке допустимых.
        
        Args:
            value: Значение для валидации
            choices: Список допустимых значений
            
        Returns:
            True если валидное, иначе ValidationError
        """
        if value not in choices:
            raise ValidationError(f"Value '{value}' is not in allowed choices: {choices}")
        
        return True
    
    @staticmethod
    def validate_regex(value: str, pattern: str, error_message: str = None) -> bool:
        """
        Валидировать строку по регулярному выражению.
        
        Args:
            value: Строка для валидации
            pattern: Регулярное выражение
            error_message: Сообщение об ошибке
            
        Returns:
            True если валидная, иначе ValidationError
        """
        if not re.match(pattern, value):
            if error_message:
                raise ValidationError(error_message)
            else:
                raise ValidationError(f"Value '{value}' does not match pattern '{pattern}'")
        
        return True


class SchemaValidator:
    """
    Валидатор для сложных структур данных по схеме.
    """
    
    def __init__(self, schema: Dict[str, Any]):
        """
        Инициализировать валидатор схемы.
        
        Args:
            schema: Словарь с описанием схемы валидации
        """
        self.schema = schema
    
    def validate(self, data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Валидировать данные по схеме.
        
        Args:
            data: Данные для валидации
            
        Returns:
            Словарь с ошибками валидации (пустой если валидация прошла успешно)
        """
        errors = {}
        
        for field_name, field_schema in self.schema.items():
            field_value = data.get(field_name)
            field_errors = []
            
            # Проверяем обязательные поля
            if field_schema.get('required', False) and field_value is None:
                field_errors.append(f"Field '{field_name}' is required")
                errors[field_name] = field_errors
                continue
            
            # Пропускаем необязательные поля если они None
            if field_value is None:
                continue
            
            # Проверяем тип
            expected_type = field_schema.get('type')
            if expected_type and not isinstance(field_value, expected_type):
                field_errors.append(f"Field '{field_name}' must be of type {expected_type.__name__}")
            
            # Проверяем вложенные схемы для сложных типов
            if isinstance(field_value, dict) and 'schema' in field_schema:
                nested_validator = SchemaValidator(field_schema['schema'])
                nested_errors = nested_validator.validate(field_value)
                if nested_errors:
                    field_errors.extend([f"Nested error in '{field_name}.{k}': {v[0]}" 
                                       for k, v in nested_errors.items()])
            
            elif isinstance(field_value, list) and 'item_schema' in field_schema:
                item_schema = field_schema['item_schema']
                for i, item in enumerate(field_value):
                    if isinstance(item, dict):
                        nested_validator = SchemaValidator(item_schema)
                        nested_errors = nested_validator.validate(item)
                        if nested_errors:
                            field_errors.extend([f"Nested error in '{field_name}[{i}].{k}': {v[0]}" 
                                               for k, v in nested_errors.items()])
            
            # Проверяем дополнительные ограничения
            if 'validator' in field_schema:
                validator_func = field_schema['validator']
                try:
                    validator_func(field_value)
                except ValidationError as e:
                    field_errors.append(str(e))
            
            if field_errors:
                errors[field_name] = field_errors
        
        return errors


# Примеры использования
class ValidationSchemas:
    """
    Предопределенные схемы валидации для часто используемых структур данных.
    """
    
    @staticmethod
    def order_creation_schema():
        """Схема валидации для создания заказа."""
        return {
            'dish_id': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=1, max_length=100)
            },
            'quantity': {
                'type': int,
                'required': True,
                'validator': lambda x: DataValidator.validate_positive_integer(x, min_value=1, max_value=100)
            },
            'delivery_type': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_choice(x, ['BUILDING', 'DOOR'])
            },
            'delivery_address_text': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=5, max_length=500)
            },
            'special_instructions': {
                'type': str,
                'required': False,
                'validator': lambda x: DataValidator.validate_string_length(x, max_length=1000)
            }
        }
    
    @staticmethod
    def producer_creation_schema():
        """Схема валидации для создания производителя."""
        return {
            'name': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=2, max_length=255)
            },
            'description': {
                'type': str,
                'required': False,
                'validator': lambda x: DataValidator.validate_string_length(x, max_length=1000)
            },
            'city': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=2, max_length=255)
            },
            'delivery_radius_km': {
                'type': (int, float, Decimal),
                'required': False,
                'validator': lambda x: DataValidator.validate_decimal_range(x, min_value=0.1, max_value=100.0)
            }
        }
    
    @staticmethod
    def dish_creation_schema():
        """Схема валидации для создания блюда."""
        return {
            'name': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=1, max_length=255)
            },
            'description': {
                'type': str,
                'required': False,
                'validator': lambda x: DataValidator.validate_string_length(x, max_length=1000)
            },
            'price': {
                'type': (int, float, Decimal),
                'required': True,
                'validator': lambda x: DataValidator.validate_money(x, min_value=Decimal('0.01'))
            },
            'category_id': {
                'type': str,
                'required': True,
                'validator': lambda x: DataValidator.validate_string_length(x, min_length=1, max_length=100)
            },
            'is_available': {
                'type': bool,
                'required': False
            },
            'calories': {
                'type': int,
                'required': False,
                'validator': lambda x: DataValidator.validate_positive_integer(x, max_value=10000)
            }
        }