# 🚀 Идеи для функционального расширения проекта

## 📊 Обзор

Этот документ содержит идеи для функционального расширения проекта HomeFood Marketplace с фокусом на надежность, масштабируемость и улучшение пользовательского опыта.

---

## 1. Улучшенная обработка ошибок

### 1.1 Система retry с экспоненциальной задержкой

```python
# backend/core/retry.py
"""
Система retry с экспоненциальной задержкой для внешних вызовов.
"""

import time
import functools
from typing import Callable, Optional, Type, Tuple
from core.logging import get_logger


logger = get_logger(__name__)


class RetryConfig:
    """Конфигурация для retry логики."""
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        backoff_factor: float = 2.0,
        exceptions: Tuple[Type[Exception], ...] = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.exceptions = exceptions


def retry(config: RetryConfig):
    """
    Декоратор для retry с экспоненциальной задержкой.
    
    Args:
        config: Конфигурация retry
    
    Example:
        @retry(RetryConfig(max_attempts=3, base_delay=1.0))
        def call_external_api():
            # ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except config.exceptions as e:
                    last_exception = e
                    
                    if attempt == config.max_attempts:
                        logger.error(
                            'retry_max_attempts_reached',
                            function=func.__name__,
                            attempts=attempt,
                            error=str(e)
                        )
                        raise
                    
                    # Вычисляем задержку
                    delay = min(
                        config.base_delay * (config.backoff_factor ** (attempt - 1)),
                        config.max_delay
                    )
                    
                    logger.warning(
                        'retry_attempt',
                        function=func.__name__,
                        attempt=attempt,
                        max_attempts=config.max_attempts,
                        delay=delay,
                        error=str(e)
                    )
                    
                    time.sleep(delay)
            
            # Этот код недостижим, но нужен для type checker
            raise last_exception
        
        return wrapper
    return decorator


# Использование
from infrastructure.external.payment_providers.tinkoff import TinkoffPaymentProvider

@retry(RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    backoff_factor=2.0,
    exceptions=(ConnectionError, TimeoutError)
))
def init_payment_with_retry(provider: TinkoffPaymentProvider, payment_data: dict):
    return provider.init_payment(payment_data)
```

### 1.2 Circuit Breaker Pattern

```python
# backend/core/circuit_breaker.py
"""
Реализация паттерна Circuit Breaker для защиты от каскадных сбоев.
"""

import time
from enum import Enum
from typing import Callable, Optional
from dataclasses import dataclass
from core.logging import get_logger


logger = get_logger(__name__)


class CircuitState(Enum):
    """Состояния circuit breaker."""
    CLOSED = "closed"      # Нормальная работа
    OPEN = "open"          # Цепь разомкнута, запросы не проходят
    HALF_OPEN = "half_open"  # Проверка восстановления


@dataclass
class CircuitBreakerConfig:
    """Конфигурация Circuit Breaker."""
    failure_threshold: int = 5      # Количество отказов для открытия
    recovery_timeout: float = 60.0   # Таймаут восстановления (секунды)
    success_threshold: int = 2       # Количество успехов для закрытия


class CircuitBreaker:
    """Реализация Circuit Breaker."""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_success_time: Optional[float] = None
    
    def call(self, func: Callable, *args, **kwargs):
        """
        Вызвать функцию через circuit breaker.
        
        Args:
            func: Функция для вызова
            *args, **kwargs: Аргументы функции
        
        Returns:
            Результат функции
        
        Raises:
            CircuitOpenError: Если circuit breaker открыт
        """
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info(
                    'circuit_breaker_half_open',
                    name=self.name
                )
            else:
                logger.warning(
                    'circuit_breaker_open',
                    name=self.name,
                    failure_count=self.failure_count
                )
                raise CircuitOpenError(f"Circuit breaker '{self.name}' is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Проверить, стоит ли попытаться восстановить circuit."""
        if self.last_failure_time is None:
            return False
        
        elapsed = time.time() - self.last_failure_time
        return elapsed >= self.config.recovery_timeout
    
    def _on_success(self):
        """Обработать успешный вызов."""
        self.last_success_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                logger.info(
                    'circuit_breaker_closed',
                    name=self.name
                )
        else:
            self.failure_count = 0
    
    def _on_failure(self):
        """Обработать неудачный вызов."""
        self.last_failure_time = time.time()
        self.failure_count += 1
        
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
            logger.warning(
                'circuit_breaker_open_after_half_open',
                name=self.name
            )
        elif self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                'circuit_breaker_open',
                name=self.name,
                failure_count=self.failure_count
            )


class CircuitOpenError(Exception):
    """Исключение когда circuit breaker открыт."""
    pass


# Использование
from infrastructure.external.payment_providers.tinkoff import TinkoffPaymentProvider

# Создаем circuit breaker
payment_circuit_breaker = CircuitBreaker(
    name="tinkoff_payment",
    config=CircuitBreakerConfig(
        failure_threshold=5,
        recovery_timeout=60.0,
        success_threshold=2
    )
)

# Используем в сервисе
class PaymentService:
    def init_payment(self, order_id: str, return_url: str):
        provider = TinkoffPaymentProvider()
        
        try:
            return payment_circuit_breaker.call(
                provider.init_payment,
                payment_id=order_id,
                amount=100.0,
                return_url=return_url
            )
        except CircuitOpenError:
            # Fallback на другой провайдер или ошибка
            raise BusinessRuleException(
                message="Payment service temporarily unavailable",
                rule_name="circuit_breaker_open"
            )
```

### 1.3 Dead Letter Queue (DLQ)

```python
# backend/core/dead_letter_queue.py
"""
Dead Letter Queue для обработки неудачных сообщений.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
from datetime import datetime
from django.db import models
from core.logging import get_logger


logger = get_logger(__name__)


class DeadLetterQueue(models.Model):
    """Модель для Dead Letter Queue."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue_name = models.CharField(max_length=255, db_index=True)
    message_type = models.CharField(max_length=255)
    payload = models.JSONField()
    error_message = models.TextField()
    error_traceback = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dead_letter_queue'
        indexes = [
            models.Index(fields=['queue_name', 'next_retry_at']),
        ]
    
    def can_retry(self) -> bool:
        """Проверить, можно ли повторить попытку."""
        if self.retry_count >= self.max_retries:
            return False
        
        if self.next_retry_at and self.next_retry_at > datetime.utcnow():
            return False
        
        return True
    
    def increment_retry(self, delay_seconds: int = 60):
        """Увеличить счетчик попыток."""
        from django.utils import timezone
        
        self.retry_count += 1
        
        if self.retry_count < self.max_retries:
            # Экспоненциальная задержка
            self.next_retry_at = timezone.now() + timezone.timedelta(
                seconds=delay_seconds * (2 ** self.retry_count)
            )
        else:
            self.next_retry_at = None
        
        self.save(update_fields=['retry_count', 'next_retry_at', 'updated_at'])


class DeadLetterQueueService:
    """Сервис для работы с Dead Letter Queue."""
    
    @staticmethod
    def enqueue(
        queue_name: str,
        message_type: str,
        payload: Dict[str, Any],
        error: Exception,
        max_retries: int = 3
    ) -> DeadLetterQueue:
        """Добавить сообщение в DLQ."""
        import traceback
        
        dlq = DeadLetterQueue.objects.create(
            queue_name=queue_name,
            message_type=message_type,
            payload=payload,
            error_message=str(error),
            error_traceback=traceback.format_exc(),
            max_retries=max_retries,
            next_retry_at=datetime.utcnow()
        )
        
        logger.error(
            'dead_letter_queued',
            queue_name=queue_name,
            message_type=message_type,
            dlq_id=str(dlq.id),
            error=str(error)
        )
        
        return dlq
    
    @staticmethod
    def process_retryable_messages(queue_name: str, processor: Callable):
        """Обработать сообщения готовые для повтора."""
        from django.utils import timezone
        
        messages = DeadLetterQueue.objects.filter(
            queue_name=queue_name,
            next_retry_at__lte=timezone.now()
        ).select_for_update()
        
        for message in messages:
            try:
                processor(message.payload)
                message.delete()
                
                logger.info(
                    'dead_letter_processed',
                    dlq_id=str(message.id),
                    queue_name=queue_name
                )
            except Exception as e:
                logger.error(
                    'dead_letter_retry_failed',
                    dlq_id=str(message.id),
                    queue_name=queue_name,
                    error=str(e)
                )
                message.increment_retry()


# Использование
from core.dead_letter_queue import DeadLetterQueueService

def send_notification(user_id: str, message: str):
    """Отправить уведомление пользователю."""
    try:
        # Попытка отправки
        notification_service.send(user_id, message)
    except Exception as e:
        # Если не удалось, добавляем в DLQ
        DeadLetterQueueService.enqueue(
            queue_name='notifications',
            message_type='send_notification',
            payload={'user_id': user_id, 'message': message},
            error=e,
            max_retries=3
        )

# Обработка DLQ (можно запустить как фоновую задачу)
def process_notification_dlq():
    """Обработать сообщения из DLQ уведомлений."""
    DeadLetterQueueService.process_retryable_messages(
        queue_name='notifications',
        processor=lambda payload: send_notification(
            payload['user_id'],
            payload['message']
        )
    )
```

---

## 2. Улучшенное логирование

### 2.1 Асинхронное логирование

```python
# backend/core/async_logging.py
"""
Асинхронное логирование для улучшения производительности.
"""

import asyncio
import logging
from queue import Queue
from threading import Thread
from typing import Any, Dict
from datetime import datetime
from core.logging import StructuredLogger


class AsyncLogHandler:
    """Асинхронный обработчик логов."""
    
    def __init__(self, logger: StructuredLogger, queue_size: int = 1000):
        self.logger = logger
        self.queue: Queue = Queue(maxsize=queue_size)
        self.worker_thread = Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
    
    def _worker(self):
        """Рабочий поток для обработки логов."""
        while True:
            try:
                log_data = self.queue.get()
                if log_data is None:  # Сигнал остановки
                    break
                
                level, event_type, kwargs = log_data
                getattr(self.logger, level)(event_type, **kwargs)
                
            except Exception as e:
                # Не должно происходить, но для безопасности
                print(f"Error in log worker: {e}")
    
    def log(self, level: str, event_type: str, **kwargs):
        """Добавить лог в очередь."""
        try:
            self.queue.put((level, event_type, kwargs), block=False)
        except Exception:
            # Если очередь полна, логируем синхронно
            getattr(self.logger, level)(event_type, **kwargs)
    
    def shutdown(self):
        """Остановить worker."""
        self.queue.put(None)
        self.worker_thread.join()


# Использование
async_logger = AsyncLogHandler(get_logger(__name__))

async_logger.log('info', 'order_created', order_id='123', user_id='456')
```

### 2.2 Логирование бизнес-событий (Event Sourcing)

```python
# backend/core/event_sourcing.py
"""
Логирование бизнес-событий для Event Sourcing.
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from django.db import models
from core.logging import get_logger


logger = get_logger(__name__)


class EventType(Enum):
    """Типы бизнес-событий."""
    ORDER_CREATED = "order_created"
    ORDER_PAID = "order_paid"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_COMPLETED = "order_completed"
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_SUCCEEDED = "payment_succeeded"
    PAYMENT_FAILED = "payment_failed"
    GIFT_CREATED = "gift_created"
    GIFT_ACTIVATED = "gift_activated"
    GIFT_EXPIRED = "gift_expired"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"


@dataclass
class DomainEvent:
    """Бизнес-событие."""
    event_id: UUID
    event_type: EventType
    aggregate_id: UUID
    aggregate_type: str
    payload: Dict[str, Any]
    occurred_at: datetime
    correlation_id: Optional[UUID] = None
    causation_id: Optional[UUID] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразовать в словарь."""
        return {
            'event_id': str(self.event_id),
            'event_type': self.event_type.value,
            'aggregate_id': str(self.aggregate_id),
            'aggregate_type': self.aggregate_type,
            'payload': self.payload,
            'occurred_at': self.occurred_at.isoformat(),
            'correlation_id': str(self.correlation_id) if self.correlation_id else None,
            'causation_id': str(self.causation_id) if self.causation_id else None,
        }


class EventStore(models.Model):
    """Хранилище бизнес-событий."""
    
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    event_type = models.CharField(max_length=100, db_index=True)
    aggregate_id = models.UUIDField(db_index=True)
    aggregate_type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField()
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    correlation_id = models.UUIDField(null=True, blank=True, db_index=True)
    causation_id = models.UUIDField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    
    class Meta:
        db_table = 'event_store'
        ordering = ['occurred_at']
        indexes = [
            models.Index(fields=['aggregate_id', 'version']),
            models.Index(fields=['event_type', 'occurred_at']),
            models.Index(fields=['correlation_id']),
        ]
    
    def to_domain_event(self) -> DomainEvent:
        """Преобразовать в DomainEvent."""
        return DomainEvent(
            event_id=self.id,
            event_type=EventType(self.event_type),
            aggregate_id=self.aggregate_id,
            aggregate_type=self.aggregate_type,
            payload=self.payload,
            occurred_at=self.occurred_at,
            correlation_id=self.correlation_id,
            causation_id=self.causation_id,
        )


class EventPublisher:
    """Публикатор бизнес-событий."""
    
    @staticmethod
    def publish(event: DomainEvent):
        """Опубликовать событие."""
        # Сохраняем в Event Store
        EventStore.objects.create(
            event_type=event.event_type.value,
            aggregate_id=event.aggregate_id,
            aggregate_type=event.aggregate_type,
            payload=event.payload,
            occurred_at=event.occurred_at,
            correlation_id=event.correlation_id,
            causation_id=event.causation_id,
        )
        
        # Логируем
        logger.info(
            'event_published',
            event_type=event.event_type.value,
            aggregate_id=str(event.aggregate_id),
            aggregate_type=event.aggregate_type,
            correlation_id=str(event.correlation_id) if event.correlation_id else None,
        )
        
        # Отправляем в message queue (RabbitMQ, Kafka и т.д.)
        # message_queue.publish(event.to_dict())


class EventReplayer:
    """Пересоздатель состояния из событий."""
    
    @staticmethod
    def replay_aggregate(aggregate_id: UUID) -> list[DomainEvent]:
        """Получить все события для агрегата."""
        events = EventStore.objects.filter(
            aggregate_id=aggregate_id
        ).order_by('version')
        
        return [event.to_domain_event() for event in events]
    
    @staticmethod
    def replay_aggregate_to_version(
        aggregate_id: UUID,
        version: int
    ) -> list[DomainEvent]:
        """Получить события до определенной версии."""
        events = EventStore.objects.filter(
            aggregate_id=aggregate_id,
            version__lte=version
        ).order_by('version')
        
        return [event.to_domain_event() for event in events]


# Использование
from core.event_sourcing import EventPublisher, EventType, DomainEvent
from uuid import uuid4

# Создаем событие
event = DomainEvent(
    event_id=uuid4(),
    event_type=EventType.ORDER_CREATED,
    aggregate_id=order.id,
    aggregate_type='Order',
    payload={
        'user_id': str(order.user_id),
        'dish_id': str(order.dish_id),
        'total_price': float(order.total_price),
    },
    occurred_at=datetime.utcnow(),
)

# Публикуем событие
EventPublisher.publish(event)
```

---

## 3. Улучшенное тестирование

### 3.1 Pytest fixtures для тестов

```python
# backend/tests/conftest.py
"""
Pytest конфигурация и fixtures.
"""

import pytest
from decimal import Decimal
from uuid import uuid4
from django.utils import timezone
from django.contrib.auth import get_user_model

from infrastructure.persistence.models import (
    Producer,
    Dish,
    Order,
    Category,
    Payment,
)
from domain.value_objects.money import Money


User = get_user_model()


@pytest.fixture
def user(db):
    """Создать тестового пользователя."""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def producer_user(db):
    """Создать пользователя-производителя."""
    user = User.objects.create_user(
        email='producer@example.com',
        password='testpass123',
        first_name='Producer',
        last_name='User'
    )
    
    category = Category.objects.create(name='Test Category')
    
    producer = Producer.objects.create(
        user=user,
        name='Test Producer',
        description='Test Description',
        city='Moscow',
        main_category=category,
    )
    
    return producer


@pytest.fixture
def dish(db, producer_user):
    """Создать тестовое блюдо."""
    return Dish.objects.create(
        name='Test Dish',
        description='Test Description',
        price=Decimal('100.00'),
        category=producer_user.main_category,
        producer=producer_user,
        photo='https://example.com/photo.jpg',
        is_available=True,
    )


@pytest.fixture
def order(db, user, dish):
    """Создать тестовый заказ."""
    return Order.objects.create(
        user=user,
        user_name='Test User',
        phone='+79001234567',
        dish=dish,
        producer=dish.producer,
        quantity=1,
        total_price=Decimal('100.00'),
        status='WAITING_FOR_PAYMENT',
    )


@pytest.fixture
def payment(db, order):
    """Создать тестовый платеж."""
    return Payment.objects.create(
        order=order,
        amount=Decimal('100.00'),
        currency='RUB',
        provider='DEV_FAKE',
        status='INITIATED',
    )


@pytest.fixture
def authenticated_client(client, user):
    """Аутентифицированный клиент."""
    from rest_framework_simplejwt.tokens import RefreshToken
    
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def money():
    """Создать Money объект."""
    return Money(Decimal('100.00'), 'RUB')
```

### 3.2 Интеграционные тесты для API

```python
# backend/tests/integration/test_api_endpoints.py
"""
Интеграционные тесты для API endpoint'ов.
"""

import pytest
from rest_framework import status
from decimal import Decimal


class TestOrderEndpoints:
    """Тесты endpoint'ов заказов."""
    
    def test_create_order_success(self, authenticated_client, dish):
        """Тест успешного создания заказа."""
        data = {
            'dish_id': str(dish.id),
            'quantity': 2,
            'delivery_type': 'BUILDING',
            'delivery_address_text': 'Test Address',
        }
        
        response = authenticated_client.post('/api/orders/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True
        assert response.data['data']['dish_id'] == str(dish.id)
        assert response.data['data']['quantity'] == 2
    
    def test_create_order_invalid_dish(self, authenticated_client):
        """Тест создания заказа с несуществующим блюдом."""
        data = {
            'dish_id': str(uuid4()),
            'quantity': 1,
        }
        
        response = authenticated_client.post('/api/orders/', data, format='json')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['success'] is False
    
    def test_get_order_success(self, authenticated_client, order):
        """Тест получения заказа."""
        response = authenticated_client.get(f'/api/orders/{order.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['id'] == str(order.id)
    
    def test_get_order_not_found(self, authenticated_client):
        """Тест получения несуществующего заказа."""
        response = authenticated_client.get(f'/api/orders/{uuid4()}/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['success'] is False
    
    def test_cancel_order_success(self, authenticated_client, order):
        """Тест отмены заказа."""
        data = {'reason': 'Test reason'}
        
        response = authenticated_client.post(
            f'/api/orders/{order.id}/cancel/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
    
    def test_list_orders_filtered_by_status(self, authenticated_client, user):
        """Тест списка заказов с фильтрацией по статусу."""
        # Создаем заказы с разными статусами
        Order.objects.create(
            user=user,
            user_name='Test User',
            phone='+79001234567',
            dish_id=uuid4(),
            producer_id=uuid4(),
            quantity=1,
            total_price=Decimal('100.00'),
            status='WAITING_FOR_PAYMENT',
        )
        
        Order.objects.create(
            user=user,
            user_name='Test User',
            phone='+79001234567',
            dish_id=uuid4(),
            producer_id=uuid4(),
            quantity=1,
            total_price=Decimal('100.00'),
            status='COMPLETED',
        )
        
        response = authenticated_client.get(
            '/api/orders/',
            {'status': 'COMPLETED'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == 1
        assert response.data['data'][0]['status'] == 'COMPLETED'
```

### 3.3 Unit тесты для сервисов

```python
# backend/tests/unit/test_services/test_payment_service.py
"""
Unit тесты для PaymentService.
"""

import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
from core.exceptions import BusinessRuleException, NotFoundException
from application.services.payment_service import PaymentService, PaymentServiceDependencies
from infrastructure.external.payment_providers.base import BasePaymentProvider


class TestPaymentService:
    """Тесты PaymentService."""
    
    @pytest.fixture
    def mock_order_repo(self):
        """Mock репозитория заказов."""
        return Mock()
    
    @pytest.fixture
    def mock_provider_factory(self):
        """Mock фабрики провайдеров."""
        return Mock()
    
    @pytest.fixture
    def payment_service(self, mock_order_repo, mock_provider_factory):
        """Создать PaymentService с mock зависимостями."""
        deps = PaymentServiceDependencies(
            order_repository=mock_order_repo,
            payment_provider_factory=mock_provider_factory
        )
        return PaymentService(deps)
    
    def test_init_payment_success(
        self,
        payment_service,
        mock_order_repo,
        mock_provider_factory
    ):
        """Тест успешной инициации платежа."""
        # Arrange
        order = Mock()
        order.id = uuid4()
        order.status = 'WAITING_FOR_PAYMENT'
        order.total_price = Decimal('100.00')
        
        mock_order_repo.get_by_id.return_value = order
        
        provider = Mock(spec=BasePaymentProvider)
        provider.provider_type = 'DEV_FAKE'
        provider.init_payment.return_value = {
            'provider_payment_id': 'test_payment_id',
            'payment_url': 'https://example.com/pay',
            'raw': {}
        }
        
        mock_provider_factory.create.return_value = provider
        
        # Act
        result = payment_service.init_payment(
            order_id=str(order.id),
            return_url='https://example.com/return'
        )
        
        # Assert
        assert result.payment_id is not None
        assert result.payment_url == 'https://example.com/pay'
        assert result.amount.amount == Decimal('100.00')
        
        mock_order_repo.get_by_id.assert_called_once()
        provider.init_payment.assert_called_once()
    
    def test_init_payment_invalid_status(
        self,
        payment_service,
        mock_order_repo
    ):
        """Тест инициации платежа с неверным статусом."""
        # Arrange
        order = Mock()
        order.id = uuid4()
        order.status = 'COMPLETED'
        
        mock_order_repo.get_by_id.return_value = order
        
        # Act & Assert
        with pytest.raises(BusinessRuleException) as exc_info:
            payment_service.init_payment(
                order_id=str(order.id),
                return_url='https://example.com/return'
            )
        
        assert exc_info.value.error_code == 'BUSINESS_RULE_VIOLATION'
    
    def test_init_payment_order_not_found(
        self,
        payment_service,
        mock_order_repo
    ):
        """Тест инициации платежа с несуществующим заказом."""
        # Arrange
        mock_order_repo.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(NotFoundException) as exc_info:
            payment_service.init_payment(
                order_id=str(uuid4()),
                return_url='https://example.com/return'
            )
        
        assert exc_info.value.error_code == 'NOT_FOUND'
```

---

## 4. Мониторинг и метрики

### 4.1 Prometheus метрики

```python
# backend/core/metrics.py
"""
Система метрик на основе Prometheus.
"""

from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_client import start_http_server
from functools import wraps
from typing import Callable
import time


# Counter для количества запросов
REQUEST_COUNT = Counter(
    'api_requests_total',
    'Total number of API requests',
    ['method', 'endpoint', 'status']
)

# Histogram для времени выполнения запросов
REQUEST_LATENCY = Histogram(
    'api_request_duration_seconds',
    'API request latency in seconds',
    ['method', 'endpoint']
)

# Counter для бизнес-событий
BUSINESS_EVENT_COUNT = Counter(
    'business_events_total',
    'Total number of business events',
    ['event_type', 'aggregate_type']
)

# Gauge для активных заказов
ACTIVE_ORDERS = Gauge(
    'active_orders_total',
    'Total number of active orders',
    ['status']
)

# Info для версии приложения
APP_INFO = Info(
    'application_info',
    'Application information'
)


def track_requests(metric_name: str = 'api'):
    """
    Декоратор для отслеживания запросов.
    
    Args:
        metric_name: Имя метрики
    
    Example:
        @track_requests()
        def my_view(request):
            # ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Получаем endpoint из аргументов
            endpoint = func.__name__
            
            # Замеряем время выполнения
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                # Записываем метрики
                duration = time.time() - start_time
                
                REQUEST_COUNT.labels(
                    method='POST',
                    endpoint=endpoint,
                    status=status
                ).inc()
                
                REQUEST_LATENCY.labels(
                    method='POST',
                    endpoint=endpoint
                ).observe(duration)
        
        return wrapper
    return decorator


def track_business_events(event_type: str, aggregate_type: str):
    """
    Декоратор для отслеживания бизнес-событий.
    
    Args:
        event_type: Тип события
        aggregate_type: Тип агрегата
    
    Example:
        @track_business_events('order_created', 'Order')
        def create_order(data):
            # ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                
                # Увеличиваем счетчик событий
                BUSINESS_EVENT_COUNT.labels(
                    event_type=event_type,
                    aggregate_type=aggregate_type
                ).inc()
                
                return result
            except Exception:
                raise
        
        return wrapper
    return decorator


def update_active_orders_metrics():
    """Обновить метрики активных заказов."""
    from infrastructure.persistence.models import Order
    
    statuses = Order.STATUS_CHOICES
    
    for status_code, status_name in statuses:
        count = Order.objects.filter(status=status_code).count()
        ACTIVE_ORDERS.labels(status=status_code).set(count)


def start_metrics_server(port: int = 8000):
    """
    Запустить сервер метрик.
    
    Args:
        port: Порт для сервера метрик
    """
    start_http_server(port)


# Инициализация информации о приложении
APP_INFO.info({
    'version': '1.0.0',
    'name': 'homefood-marketplace'
})


# Использование
@track_requests()
def create_order_view(request):
    # ...
    pass


@track_business_events('order_created', 'Order')
def create_order_service(data):
    # ...
    pass
```

### 4.2 Health Checks

```python
# backend/core/health.py
"""
Health checks для приложения.
"""

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum
from django.db import connections
from django.core.cache import cache
from redis import Redis
from core.logging import get_logger


logger = get_logger(__name__)


class HealthStatus(Enum):
    """Статус здоровья."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


@dataclass
class HealthCheckResult:
    """Результат проверки здоровья."""
    name: str
    status: HealthStatus
    message: Optional[str] = None
    response_time_ms: Optional[float] = None


class HealthChecker:
    """Проверка здоровья приложения."""
    
    @staticmethod
    def check_database() -> HealthCheckResult:
        """Проверить соединение с базой данных."""
        import time
        
        start_time = time.time()
        
        try:
            with connections['default'].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                name='database',
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time
            )
        except Exception as e:
            logger.error('database_health_check_failed', error=str(e))
            return HealthCheckResult(
                name='database',
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )
    
    @staticmethod
    def check_cache() -> HealthCheckResult:
        """Проверить соединение с кэшем."""
        import time
        
        start_time = time.time()
        
        try:
            cache.set('health_check', 'ok', timeout=10)
            result = cache.get('health_check')
            
            response_time = (time.time() - start_time) * 1000
            
            if result == 'ok':
                return HealthCheckResult(
                    name='cache',
                    status=HealthStatus.HEALTHY,
                    response_time_ms=response_time
                )
            else:
                return HealthCheckResult(
                    name='cache',
                    status=HealthStatus.UNHEALTHY,
                    message='Cache returned unexpected value'
                )
        except Exception as e:
            logger.error('cache_health_check_failed', error=str(e))
            return HealthCheckResult(
                name='cache',
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )
    
    @staticmethod
    def check_redis() -> HealthCheckResult:
        """Проверить соединение с Redis."""
        import time
        from django.conf import settings
        
        start_time = time.time()
        
        try:
            redis_client = Redis.from_url(settings.CACHES['default']['LOCATION'])
            redis_client.ping()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                name='redis',
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time
            )
        except Exception as e:
            logger.error('redis_health_check_failed', error=str(e))
            return HealthCheckResult(
                name='redis',
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )
    
    @staticmethod
    def check_payment_provider() -> HealthCheckResult:
        """Проверить доступность платежного провайдера."""
        import time
        from infrastructure.external.payment_providers.factory import PaymentProviderFactory
        
        start_time = time.time()
        
        try:
            provider = PaymentProviderFactory.create('DEV_FAKE')
            # Проверяем health endpoint если есть
            if hasattr(provider, 'health_check'):
                provider.health_check()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                name='payment_provider',
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time
            )
        except Exception as e:
            logger.error('payment_provider_health_check_failed', error=str(e))
            return HealthCheckResult(
                name='payment_provider',
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )
    
    @classmethod
    def check_all(cls) -> dict:
        """Проверить все компоненты."""
        checks: List[HealthCheckResult] = [
            cls.check_database(),
            cls.check_cache(),
            cls.check_redis(),
            cls.check_payment_provider(),
        ]
        
        # Определяем общий статус
        overall_status = HealthStatus.HEALTHY
        for check in checks:
            if check.status == HealthStatus.UNHEALTHY:
                overall_status = HealthStatus.UNHEALTHY
                break
            elif check.status == HealthStatus.DEGRADED:
                overall_status = HealthStatus.DEGRADED
        
        return {
            'status': overall_status.value,
            'checks': [
                {
                    'name': check.name,
                    'status': check.status.value,
                    'message': check.message,
                    'response_time_ms': check.response_time_ms,
                }
                for check in checks
            ]
        }


# API endpoint для health checks
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class HealthCheckView(APIView):
    """API endpoint для health checks."""
    
    def get(self, request):
        """Получить статус здоровья."""
        health_data = HealthChecker.check_all()
        
        http_status = status.HTTP_200_OK
        if health_data['status'] == HealthStatus.UNHEALTHY.value:
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        elif health_data['status'] == HealthStatus.DEGRADED.value:
            http_status = status.HTTP_200_OK
        
        return Response(health_data, status=http_status)


# Добавить в urls.py
# path('health/', HealthCheckView.as_view(), name='health-check'),
```

---

## 5. Дополнительные функции

### 5.1 WebSocket для реальных уведомлений

```python
# backend/api/websocket/consumers.py
"""
WebSocket consumers для реальных уведомлений.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from core.logging import get_logger


logger = get_logger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer для уведомлений пользователя."""
    
    async def connect(self):
        """Обработать подключение."""
        user = self.scope["user"]
        
        if not user or not user.is_authenticated:
            logger.warning('websocket_unauthenticated_connection_attempt')
            await self.close()
            return
        
        # Создаем группу для пользователя
        self.user_group_name = f'user_{user.id}'
        
        # Присоединяемся к группе
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(
            'websocket_connected',
            user_id=str(user.id)
        )
    
    async def disconnect(self, close_code):
        """Обработать отключение."""
        user = self.scope["user"]
        
        if user:
            # Покидаем группу
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            
            logger.info(
                'websocket_disconnected',
                user_id=str(user.id),
                close_code=close_code
            )
    
    async def receive(self, text_data):
        """Обработать входящее сообщение."""
        try:
            data = json.loads(text_data)
            
            # Обрабатываем разные типы сообщений
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(json.dumps({'type': 'pong'}))
            else:
                logger.warning(
                    'websocket_unknown_message_type',
                    message_type=message_type
                )
        
        except json.JSONDecodeError:
            logger.error('websocket_invalid_json', text_data=text_data)
    
    async def notification_message(self, event):
        """Отправить уведомление пользователю."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))
    
    async def order_status_update(self, event):
        """Отправить обновление статуса заказа."""
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'data': event['data']
        }))


# Отправка уведомлений
async def send_user_notification(user_id: str, notification_data: dict):
    """Отправить уведомление пользователю через WebSocket."""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    await channel_layer.group_send(
        f'user_{user_id}',
        {
            'type': 'notification_message',
            'data': notification_data
        }
    )
```

### 5.2 Аналитика и отчеты

```python
# backend/application/services/analytics_service.py
"""
Сервис аналитики и отчетов.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone

from infrastructure.persistence.models import Order, Producer, Dish, Payment
from core.logging import get_logger


logger = get_logger(__name__)


@dataclass
class OrderAnalytics:
    """Аналитика заказов."""
    total_orders: int
    completed_orders: int
    cancelled_orders: int
    total_revenue: Decimal
    average_order_value: Decimal
    completion_rate: float


@dataclass
class ProducerAnalytics:
    """Аналитика производителя."""
    producer_id: str
    producer_name: str
    total_orders: int
    completed_orders: int
    total_revenue: Decimal
    average_rating: float
    average_delivery_time_minutes: float


@dataclass
class DishAnalytics:
    """Аналитика блюд."""
    dish_id: str
    dish_name: str
    total_orders: int
    total_revenue: Decimal
    average_rating: float
    views_count: int


class AnalyticsService:
    """Сервис аналитики."""
    
    def get_order_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> OrderAnalytics:
        """
        Получить аналитику заказов.
        
        Args:
            start_date: Начальная дата
            end_date: Конечная дата
        
        Returns:
            OrderAnalytics с данными аналитики
        """
        queryset = Order.objects.all()
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Агрегируем данные
        total_orders = queryset.count()
        completed_orders = queryset.filter(status='COMPLETED').count()
        cancelled_orders = queryset.filter(status='CANCELLED').count()
        
        revenue_data = queryset.filter(
            status='COMPLETED'
        ).aggregate(
            total_revenue=Sum('total_price'),
            avg_order_value=Avg('total_price')
        )
        
        total_revenue = revenue_data['total_revenue'] or Decimal('0')
        average_order_value = revenue_data['avg_order_value'] or Decimal('0')
        
        completion_rate = (
            (completed_orders / total_orders * 100)
            if total_orders > 0
            else 0.0
        )
        
        return OrderAnalytics(
            total_orders=total_orders,
            completed_orders=completed_orders,
            cancelled_orders=cancelled_orders,
            total_revenue=total_revenue,
            average_order_value=average_order_value,
            completion_rate=completion_rate
        )
    
    def get_top_producers(
        self,
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ProducerAnalytics]:
        """
        Получить топ производителей.
        
        Args:
            limit: Количество производителей
            start_date: Начальная дата
            end_date: Конечная дата
        
        Returns:
            Список ProducerAnalytics
        """
        queryset = Producer.objects.annotate(
            total_orders=Count('orders'),
            completed_orders=Count(
                'orders',
                filter=models.Q(orders__status='COMPLETED')
            ),
            total_revenue=Sum(
                'orders__total_price',
                filter=models.Q(orders__status='COMPLETED')
            )
        ).filter(total_orders__gt=0)
        
        if start_date:
            queryset = queryset.filter(orders__created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(orders__created_at__lte=end_date)
        
        producers = queryset.order_by('-total_revenue')[:limit]
        
        analytics = []
        for producer in producers:
            analytics.append(ProducerAnalytics(
                producer_id=str(producer.id),
                producer_name=producer.name,
                total_orders=producer.total_orders,
                completed_orders=producer.completed_orders,
                total_revenue=producer.total_revenue or Decimal('0'),
                average_rating=producer.rating,
                average_delivery_time_minutes=producer.delivery_time_minutes
            ))
        
        return analytics
    
    def get_popular_dishes(
        self,
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[DishAnalytics]:
        """
        Получить популярные блюда.
        
        Args:
            limit: Количество блюд
            start_date: Начальная дата
            end_date: Конечная дата
        
        Returns:
            Список DishAnalytics
        """
        queryset = Dish.objects.annotate(
            total_orders=Count('orders'),
            total_revenue=Sum(
                'orders__total_price',
                filter=models.Q(orders__status='COMPLETED')
            )
        ).filter(total_orders__gt=0)
        
        if start_date:
            queryset = queryset.filter(orders__created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(orders__created_at__lte=end_date)
        
        dishes = queryset.order_by('-total_orders')[:limit]
        
        analytics = []
        for dish in dishes:
            analytics.append(DishAnalytics(
                dish_id=str(dish.id),
                dish_name=dish.name,
                total_orders=dish.total_orders,
                total_revenue=dish.total_revenue or Decimal('0'),
                average_rating=dish.rating,
                views_count=dish.views_count
            ))
        
        return analytics
    
    def get_daily_revenue(
        self,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Получить ежедневную выручку.
        
        Args:
            days: Количество дней
        
        Returns:
            Список с ежедневной выручкой
        """
        from django.db.models.functions import TruncDate
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        data = Order.objects.filter(
            status='COMPLETED',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('total_price'),
            orders_count=Count('id')
        ).order_by('date')
        
        return list(data)
```

---

## Итог

Этот документ содержит идеи для функционального расширения проекта:

1. **Улучшенная обработка ошибок:**
   - Retry с экспоненциальной задержкой
   - Circuit Breaker Pattern
   - Dead Letter Queue

2. **Улучшенное логирование:**
   - Асинхронное логирование
   - Event Sourcing для бизнес-событий

3. **Улучшенное тестирование:**
   - Pytest fixtures
   - Интеграционные тесты
   - Unit тесты для сервисов

4. **Мониторинг и метрики:**
   - Prometheus метрики
   - Health Checks

5. **Дополнительные функции:**
   - WebSocket для реальных уведомлений
   - Аналитика и отчеты

Эти улучшения повысят надежность, масштабируемость и наблюдаемость приложения.
