# 🔍 Детальный аудит проекта HomeFood Marketplace

## 📋 Обзор проекта

**Тип проекта:** Django REST API для маркетплейса домашней еды  
**Стек технологий:** Django, Django REST Framework, PostgreSQL/SQLite, JWT  
**Доменная область:** Маркетплейс еды с системой заказов, подарков, платежей и споров

---

## 🚨 Критические проблемы (High Priority)

### 1. **Архитектурные проблемы**

#### Проблема: Отсутствие четкого разделения слоев
**Файл:** [`backend/api/views.py`](backend/api/views.py:1)  
**Описание:** В файле `views.py` (3763 строки) смешана логика представления, бизнес-логика и валидация данных.

**Пример проблемы:**
```python
# views.py:183-329 - Функция _update_gift_details_logic содержит 147 строк бизнес-логики
def _update_gift_details_logic(request, pk):
    order = Order.objects.filter(id=pk, is_gift=True).first()
    # ... 140+ строк бизнес-логики
```

**Рекомендация:** Вынести бизнес-логику в сервисы, а в views оставить только обработку HTTP запросов.

#### Проблема: God Object - Модель Order
**Файл:** [`backend/api/models.py`](backend/api/models.py:204)  
**Описание:** Модель [`Order`](backend/api/models.py:204) содержит более 50 полей, нарушает принцип единственной ответственности.

**Пример:**
```python
# models.py:204-323 - Order model с 50+ полями
class Order(models.Model):
    # ... 50+ полей смешивают разные аспекты:
    # - Данные заказа
    # - Данные доставки
    # - Финансовые данные
    # - Данные подарка
    # - Данные перепланировки
```

**Рекомендация:** Разделить на несколько моделей через наследование или композицию:
- `OrderBase` - основные данные
- `OrderDelivery` - данные доставки
- `OrderFinance` - финансовые данные
- `OrderGift` - данные подарка

### 2. **Проблемы безопасности**

#### Проблема: CORS_ALLOW_ALL_ORIGINS = True
**Файл:** [`backend/backend/settings.py`](backend/backend/settings.py:109)  
**Описание:** В production разрешены запросы с любого источника.

```python
# settings.py:109
CORS_ALLOW_ALL_ORIGINS = True  # ❌ Небезопасно для production
```

**Рекомендация:**
```python
# Использовать явный список разрешенных origins
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]
CORS_ALLOW_CREDENTIALS = True
```

#### Проблема: Отсутствие rate limiting для большинства endpoint'ов
**Описание:** Только 3 endpoint'а имеют rate limiting.

**Рекомендация:** Добавить rate limiting для всех публичных endpoint'ов:
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    }
}
```

#### Проблема: Отсутствие валидации JSONField
**Файл:** [`backend/api/models.py`](backend/api/models.py:35)  
**Описание:** JSONFields используются без валидации схемы.

```python
# models.py:35 - Без валидации
weekly_schedule = models.JSONField(default=list, blank=True)
```

**Рекомендация:** Использовать django-jsonfield или создать custom validators:
```python
from django.core.exceptions import ValidationError

def validate_weekly_schedule(value):
    if not isinstance(value, list):
        raise ValidationError("Schedule must be a list")
    for day in value:
        if not isinstance(day, dict):
            raise ValidationError("Each day must be a dict")
        required_keys = ['day', 'start', 'end']
        if not all(k in day for k in required_keys):
            raise ValidationError(f"Missing required keys: {required_keys}")

weekly_schedule = models.JSONField(
    default=list, 
    blank=True,
    validators=[validate_weekly_schedule]
)
```

### 3. **Проблемы производительности**

#### Проблема: N+1 запросы в сериализаторах
**Файл:** [`backend/api/serializers.py`](backend/api/serializers.py:193)  
**Описание:** Отсутствие `select_related`/`prefetch_related`.

```python
# serializers.py:193 - Потенциальная N+1 проблема
def get_dish_additional_photos(self, obj):
    return [img.image.url for img in order.dish.images.all()]  # N+1 запрос
```

**Рекомендация:**
```python
# В ViewSet
queryset = Review.objects.select_related(
    'order__dish__producer',
    'user'
).prefetch_related(
    'order__dish__images'
)

# В serializer
def get_dish_additional_photos(self, obj):
    return [img.image.url for img in obj.order.dish.images.all()]
```

#### Проблема: Отсутствие индексов
**Файл:** [`backend/api/models.py`](backend/api/models.py:204)  
**Описание:** Часто запрашиваемые поля не индексированы.

**Рекомендация:** Добавить индексы:
```python
class Order(models.Model):
    status = models.CharField(
        max_length=50, 
        choices=STATUS_CHOICES, 
        default='WAITING_FOR_PAYMENT',
        db_index=True  # Добавить индекс
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='orders',
        db_index=True  # Добавить индекс
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['producer', 'status']),
        ]
```

#### Проблема: Отсутствие кэширования
**Описание:** Часто запрашиваемые данные не кэшируются.

**Рекомендация:** Добавить кэширование для статических данных:
```python
from django.core.cache import cache

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    def list(self, request, *args, **kwargs):
        cache_key = 'categories_list'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=3600)  # 1 час
        return response
```

### 4. **Проблемы обработки ошибок**

#### Проблема: Отсутствие централизованной обработки исключений
**Описание:** Каждая view обрабатывает ошибки по-разному.

**Рекомендация:** Создать глобальный exception handler:
```python
# backend/core/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        logger.error(
            f"API Error: {exc}",
            extra={
                'status_code': response.status_code,
                'view': context['view'].__class__.__name__,
                'request': context['request']
            }
        )
        
        custom_response_data = {
            'success': False,
            'error': str(exc),
            'status_code': response.status_code
        }
        response.data = custom_response_data
    
    return response

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}
```

#### Проблема: Отсутствие структурированного логирования
**Описание:** Логирование практически отсутствует в коде.

**Рекомендация:** Добавить структурированное логирование:
```python
# backend/core/logging.py
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
    
    def log_event(self, level, event_type, **kwargs):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            **kwargs
        }
        getattr(self.logger, level)(json.dumps(log_data))

# Использование
logger = StructuredLogger(__name__)
logger.log_event('info', 'order_created', order_id=str(order.id), user_id=str(user.id))
```

---

## ⚠️ Средние проблемы (Medium Priority)

### 5. **Нарушения принципов SOLID**

#### Нарушение SRP (Single Responsibility Principle)
**Файл:** [`backend/api/views.py`](backend/api/views.py:332)  
**Описание:** Функция `moderate_shop_name` (143 строки) делает слишком много.

**Проблема:**
```python
# views.py:332-474 - Функция делает:
# 1. Валидацию базовых правил
# 2. Проверку на мат
# 3. Вызов Ollama API
# 4. Обработку ошибок
def moderate_shop_name(name: str):
    # ... 143 строк
```

**Рекомендация:** Разделить на отдельные классы:
```python
# backend/services/moderation/base_moderator.py
class BaseModerator:
    def moderate(self, text: str) -> ModerationResult:
        raise NotImplementedError

# backend/services/moderation/rules_moderator.py
class RulesModerator(BaseModerator):
    def moderate(self, text: str) -> ModerationResult:
        # Базовые правила

# backend/services/moderation/profanity_moderator.py
class ProfanityModerator(BaseModerator):
    def moderate(self, text: str) -> ModerationResult:
        # Проверка на мат

# backend/services/moderation/ai_moderator.py
class AIModerator(BaseModerator):
    def moderate(self, text: str) -> ModerationResult:
        # Вызов Ollama API

# backend/services/moderation/shop_name_moderator.py
class ShopNameModerator:
    def __init__(self):
        self.moderators = [
            RulesModerator(),
            ProfanityModerator(),
            AIModerator()
        ]
    
    def moderate(self, name: str) -> ModerationResult:
        for moderator in self.moderators:
            result = moderator.moderate(name)
            if not result.is_approved:
                return result
        return ModerationResult(approved=True, reason='all_checks_passed')
```

#### Нарушение OCP (Open/Closed Principle)
**Описание:** Hardcoded логика выбора провайдера платежей.

**Проблема:**
```python
# payment_service.py:27
provider=Payment.Provider.DEV_FAKE,  # Hardcoded
```

**Рекомендация:** Использовать фабрику:
```python
# backend/services/payment_providers/factory.py
from abc import ABC, abstractmethod

class PaymentProviderFactory:
    _providers = {}
    
    @classmethod
    def register(cls, provider_type: str, provider_class):
        cls._providers[provider_type] = provider_class
    
    @classmethod
    def create(cls, provider_type: str) -> BasePaymentProvider:
        provider_class = cls._providers.get(provider_type)
        if not provider_class:
            raise ValueError(f"Unknown provider type: {provider_type}")
        return provider_class()

# Регистрация провайдеров
PaymentProviderFactory.register('DEV_FAKE', DevFakePaymentProvider)
PaymentProviderFactory.register('TINKOFF', TinkoffPaymentProvider)

# Использование
provider = PaymentProviderFactory.create(settings.DEFAULT_PAYMENT_PROVIDER)
```

#### Нарушение DIP (Dependency Inversion Principle)
**Описание:** Прямые зависимости на конкретные реализации.

**Проблема:**
```python
# order_status.py:31-34
class OrderStatusService:
    def __init__(self):
        self.notifications = NotificationService()  # Прямая зависимость
        self.penalties = PenaltyService()  # Прямая зависимость
```

**Рекомендация:** Использовать dependency injection:
```python
# backend/services/order_status.py
from dataclasses import dataclass
from typing import Protocol

@dataclass
class OrderStatusServiceDependencies:
    notifications: 'NotificationService'
    penalties: 'PenaltyService'
    finance: 'OrderFinanceService'
    payments: 'PaymentService'
    disputes: 'DisputeService'

class OrderStatusService:
    def __init__(self, deps: OrderStatusServiceDependencies):
        self.deps = deps
        self.notifications = deps.notifications
        self.penalties = deps.penalties
        self.finance = deps.finance
        self.payments = deps.payments
        self.disputes = deps.disputes
```

### 6. **Проблемы в коде**

#### Проблема: Дублирование кода
**Файл:** [`backend/api/gift_service.py`](backend/api/gift_service.py:44)  
**Описание:** Методы `_generate_code` и `_generate_token` дублируются.

**Проблема:**
```python
# gift_service.py:44-52
def _generate_code(self) -> str:
    import uuid
    return uuid.uuid4().hex[:10].upper()

def _generate_token(self) -> str:
    import uuid
    return uuid.uuid4().hex
```

**Рекомендация:** Вынести в утилиты:
```python
# backend/utils/crypto.py
import uuid

def generate_short_code(length: int = 10) -> str:
    return uuid.uuid4().hex[:length].upper()

def generate_token() -> str:
    return uuid.uuid4().hex
```

#### Проблема: Magic numbers и strings
**Файл:** [`backend/api/order_status.py`](backend/api/order_status.py:104)  
**Описание:** Hardcoded значения в коде.

**Проблема:**
```python
# order_status.py:104
if producer.consecutive_rejections >= 3:  # Magic number
```

**Рекомендация:** Вынести в константы:
```python
# backend/constants/producer.py
MAX_CONSECUTIVE_REJECTIONS = 3
PENALTY_POINTS_PER_REJECTION = 1
RATING_DECREMENT = 1

# Использование
if producer.consecutive_rejections >= MAX_CONSECUTIVE_REJECTIONS:
    producer.is_banned = True
```

#### Проблема: Отсутствие type hints
**Описание:** Многие функции не имеют аннотаций типов.

**Рекомендация:** Добавить type hints:
```python
from typing import Optional, Dict, Any
from decimal import Decimal

def calculate_delivery_price(
    base_price: Decimal,
    distance_km: float,
    delivery_type: str,
    pricing_rules: Optional[Dict[str, Any]] = None
) -> Decimal:
    """Calculate delivery price based on distance and type."""
    # ...
```

### 7. **Проблемы в сериализаторах**

#### Проблема: Использование `fields = '__all__'`
**Файл:** [`backend/api/serializers.py`](backend/api/serializers.py:200)  
**Описание:** Небезопасно раскрывать все поля.

**Проблема:**
```python
# serializers.py:200
class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = '__all__'  # ❌ Небезопасно
```

**Рекомендация:** Явно указать поля:
```python
class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ['id', 'code', 'reward_type', 'reward_value', 'is_used', 'expires_at']
        read_only_fields = ['id', 'is_used', 'created_at']
```

#### Проблема: Отсутствие валидации на уровне сериализаторов
**Описание:** Валидация только на уровне модели.

**Рекомендация:** Добавить валидацию в сериализаторы:
```python
class OrderSerializer(serializers.ModelSerializer):
    def validate_total_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Total price must be positive")
        return value
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        if value > 100:
            raise serializers.ValidationError("Quantity cannot exceed 100")
        return value
    
    def validate(self, data):
        dish = data.get('dish')
        quantity = data.get('quantity', 1)
        
        if dish and dish.max_quantity_per_order:
            if quantity > dish.max_quantity_per_order:
                raise serializers.ValidationError(
                    f"Maximum quantity for this dish is {dish.max_quantity_per_order}"
                )
        return data
```

---

## 📝 Низкоприоритетные проблемы (Low Priority)

### 8. **Отсутствие тестов**

**Проблема:** В проекте отсутствуют unit, integration и e2e тесты.

**Рекомендация:** Создать структуру тестов:
```
backend/
├── tests/
│   ├── unit/
│   │   ├── test_models.py
│   │   ├── test_serializers.py
│   │   └── test_services/
│   │       ├── test_payment_service.py
│   │       ├── test_gift_service.py
│   │       └── test_order_status_service.py
│   ├── integration/
│   │   ├── test_api_endpoints.py
│   │   └── test_workflows.py
│   └── e2e/
│       └── test_user_journeys.py
```

**Пример теста:**
```python
# backend/tests/unit/test_services/test_payment_service.py
import pytest
from decimal import Decimal
from api.services.payment_service import PaymentService
from api.models import Order, Payment

@pytest.mark.django_db
def test_init_payment_success(order_factory):
    order = order_factory(status='WAITING_FOR_PAYMENT', total_price=Decimal('100.00'))
    service = PaymentService()
    
    payment, payment_url = service.init_payment(order, 'https://example.com/return')
    
    assert payment.status == Payment.Status.PENDING
    assert payment.amount == Decimal('100.00')
    assert payment_url is not None
    assert order.current_payment == payment

@pytest.mark.django_db
def test_init_payment_invalid_status(order_factory):
    order = order_factory(status='COMPLETED', total_price=Decimal('100.00'))
    service = PaymentService()
    
    with pytest.raises(ValueError, match="Order is not in payment state"):
        service.init_payment(order, 'https://example.com/return')
```

### 9. **Отсутствие документации API**

**Проблема:** API не документирован (отсутствует Swagger/OpenAPI).

**Рекомендация:** Добавить drf-spectacular:
```python
# requirements.txt
drf-spectacular>=0.27.0

# settings.py
INSTALLED_APPS = [
    # ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'HomeFood Marketplace API',
    'DESCRIPTION': 'API для маркетплейса домашней еды',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

### 10. **Отсутствие миграций для индексов**

**Проблема:** Индексы не созданы через миграции.

**Рекомендация:** Создать миграцию:
```python
# backend/api/migrations/0053_add_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0052_order_recipient_name'),
    ]
    
    operations = [
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['status', 'created_at'], name='order_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['user', 'status'], name='order_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['producer', 'status'], name='order_producer_status_idx'),
        ),
    ]
```

---

## 🎯 Рекомендации по рефакторингу

### Приоритет 1: Критические исправления

1. **Разделить модель Order на несколько моделей**
2. **Вынести бизнес-логику из views.py в сервисы**
3. **Исправить настройки CORS для production**
4. **Добавить rate limiting для всех endpoint'ов**
5. **Добавить валидацию для JSONField**
6. **Добавить индексы в базу данных**
7. **Создать централизованный exception handler**
8. **Добавить структурированное логирование**

### Приоритет 2: Улучшение архитектуры

1. **Создать слои: presentation, application, domain, infrastructure**
2. **Реализовать паттерн Repository для работы с данными**
3. **Создать интерфейсы и абстракции для сервисов**
4. **Реализовать dependency injection**
5. **Разделить функции с нарушением SRP**
6. **Устранить дублирование кода**
7. **Вынести magic numbers и strings в константы**
8. **Добавить type hints**

### Приоритет 3: Улучшение качества кода

1. **Добавить unit тесты для сервисов**
2. **Добавить integration тесты для API**
3. **Добавить e2e тесты для пользовательских сценариев**
4. **Добавить документацию API (Swagger/OpenAPI)**
5. **Добавить валидацию в сериализаторы**
6. **Устранить N+1 проблемы**
7. **Добавить кэширование**

---

## 📊 Метрики качества кода

| Метрика | Текущее значение | Целевое значение | Статус |
|---------|-----------------|------------------|--------|
| Размер файла views.py | 3763 строк | < 500 строк | ❌ |
| Размер модели Order | 50+ полей | < 20 полей | ❌ |
| Покрытие тестами | 0% | > 80% | ❌ |
| Количество индексов | 0 | > 10 | ❌ |
| Rate limiting | 3 endpoint'а | Все endpoint'ы | ❌ |
| CORS безопасность | Разрешены все origins | Только разрешенные | ❌ |
| Логирование | Минимальное | Структурированное | ❌ |
| Документация API | Отсутствует | Swagger/OpenAPI | ❌ |

---

## 🔄 Предлагаемая архитектура

```
backend/
├── api/                          # Presentation Layer
│   ├── views/                    # API Views
│   │   ├── __init__.py
│   │   ├── producer_views.py
│   │   ├── dish_views.py
│   │   ├── order_views.py
│   │   └── gift_views.py
│   ├── serializers/               # Serializers
│   │   ├── __init__.py
│   │   ├── producer_serializers.py
│   │   ├── dish_serializers.py
│   │   └── order_serializers.py
│   └── urls.py
│
├── domain/                       # Domain Layer
│   ├── entities/                 # Domain Entities
│   │   ├── __init__.py
│   │   ├── order.py
│   │   ├── producer.py
│   │   └── dish.py
│   ├── value_objects/            # Value Objects
│   │   ├── __init__.py
│   │   ├── money.py
│   │   └── delivery_address.py
│   └── repositories/              # Repository Interfaces
│       ├── __init__.py
│       ├── order_repository.py
│       └── producer_repository.py
│
├── application/                  # Application Layer
│   ├── services/                 # Application Services
│   │   ├── __init__.py
│   │   ├── order_service.py
│   │   ├── payment_service.py
│   │   └── gift_service.py
│   ├── commands/                 # Commands
│   │   ├── __init__.py
│   │   ├── create_order.py
│   │   └── cancel_order.py
│   └── queries/                  # Queries
│       ├── __init__.py
│       ├── get_order.py
│       └── list_orders.py
│
├── infrastructure/               # Infrastructure Layer
│   ├── persistence/              # Data Access
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── order_repository_impl.py
│   │   │   └── producer_repository_impl.py
│   │   └── migrations/
│   ├── external/                 # External Services
│   │   ├── __init__.py
│   │   ├── payment_providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── tinkoff.py
│   │   │   └── factory.py
│   │   └── moderation/
│   │       ├── __init__.py
│   │       ├── ai_moderator.py
│   │       └── rules_moderator.py
│   └── logging/                 # Logging
│       ├── __init__.py
│       └── structured_logger.py
│
├── core/                         # Core/Shared
│   ├── __init__.py
│   ├── exceptions.py             # Custom Exceptions
│   ├── validators.py             # Validators
│   ├── constants.py              # Constants
│   └── pagination.py             # Pagination
│
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── config/                       # Configuration
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

## 🚀 Следующие шаги

1. **Создать план миграции на новую архитектуру**
2. **Начать с критических исправлений безопасности**
3. **Постепенно рефакторить код, сохраняя работоспособность**
4. **Добавлять тесты по мере рефакторинга**
5. **Мониторить производительность после каждого изменения**
