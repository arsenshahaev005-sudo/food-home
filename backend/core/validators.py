"""
Валидаторы для полей моделей и сериализаторов.
"""

import re
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


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

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}


class DeliveryPricingRulesValidator(JSONSchemaValidator):
    """Валидатор для delivery_pricing_rules."""

    RULES_SCHEMA = {
        'start': {'type': str, 'required': True},
        'end': {'type': str, 'required': True},
        'surcharge': {'type': (int, float, Decimal), 'required': True},
    }

    def __init__(self):
        super().__init__(self.RULES_SCHEMA)

    def __call__(self, value):
        if not isinstance(value, list):
            raise ValidationError(_("Delivery pricing rules must be a list"))

        for rule in value:
            super().__call__(rule)

            # Проверяем формат времени
            time_fields = ['start', 'end']
            for field in time_fields:
                if field in rule:
                    if not re.match(r'^\d{2}:\d{2}$', rule[field]):
                        raise ValidationError(
                            _("Field '%(field)s' must be in HH:MM format"),
                            params={"field": field}
                        )

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}


class DeliveryZonesValidator(JSONSchemaValidator):
    """Валидатор для delivery_zones."""

    ZONE_SCHEMA = {
        'zone_id': {'type': str, 'required': False},
        'name': {'type': str, 'required': False},
        'radius_km': {'type': (int, float, Decimal), 'required': True},
        'time_minutes': {'type': int, 'required': False},
        'price': {'type': (int, float, Decimal), 'required': False},
    }

    def __init__(self):
        super().__init__(self.ZONE_SCHEMA)

    def __call__(self, value):
        if not isinstance(value, list):
            raise ValidationError(_("Delivery zones must be a list"))

        for zone in value:
            super().__call__(zone)

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}


class RequisitesValidator(JSONSchemaValidator):
    """Валидатор для requisites."""

    REQUISITES_SCHEMA = {
        'legal_name': {'type': str, 'required': False},
        'inn': {'type': str, 'required': False},
        'ogrn': {'type': str, 'required': False},
        'bank_account': {'type': str, 'required': False},
        'bank_name': {'type': str, 'required': False},
        'bank_bic': {'type': str, 'required': False},
    }

    def __init__(self):
        super().__init__(self.REQUISITES_SCHEMA)

    def __call__(self, value):
        if not isinstance(value, dict):
            raise ValidationError(_("Requisites must be a dictionary"))

        super().__call__(value)

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}


class EmployeesValidator(JSONSchemaValidator):
    """Валидатор для employees."""

    EMPLOYEE_SCHEMA = {
        'name': {'type': str, 'required': True},
        'position': {'type': str, 'required': False},
        'phone': {'type': str, 'required': False},
        'email': {'type': str, 'required': False},
    }

    def __init__(self):
        super().__init__(self.EMPLOYEE_SCHEMA)

    def __call__(self, value):
        if not isinstance(value, list):
            raise ValidationError(_("Employees must be a list"))

        for employee in value:
            super().__call__(employee)

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}


class DocumentsValidator(JSONSchemaValidator):
    """Валидатор для documents."""

    DOCUMENT_SCHEMA = {
        'type': {'type': str, 'required': True},
        'url': {'type': str, 'required': True},
        'uploaded_at': {'type': str, 'required': False},
    }

    def __init__(self):
        super().__init__(self.DOCUMENT_SCHEMA)

    def __call__(self, value):
        if not isinstance(value, list):
            raise ValidationError(_("Documents must be a list"))

        for document in value:
            super().__call__(document)

    def deconstruct(self):
        path = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return path, [], {}