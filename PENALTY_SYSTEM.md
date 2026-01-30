# Система штрафов и блокировки магазинов

## Описание

Реализована логика автоматического управления штрафами и блокировкой магазинов, которые не принимают заказы.

## Основные правила

### 1. Штрафы за непринятые заказы

Когда магазин отклоняет заказ:
- Автоматически создается отзыв (Review) с 1 звездой по всем параметрам (вкус, внешний вид, сервис, порция, упаковка)
- Отзыв помечается флагом `is_auto_generated = True`
- **Покупатель НЕ может создать свой отзыв для отмененного заказа** (автоматический отзыв - единственный рейтинг)
- Магазину начисляется **1 штрафное очко** (`penalty_points`)
- Увеличивается счетчик **последовательных отказов** (`consecutive_rejections`)
- К заказу добавляется **штраф 30%** от стоимости ТОВАРА (`penalty_amount`)
- Рейтинг магазина автоматически пересчитывается с учетом нового отзыва
- Покупателю возвращаются деньги

### 2. Автоматическая блокировка

Если магазин отклонил **3 заказа подряд** (или **4 заказа подряд**, если оплачивал штраф в текущем месяце):
- Магазин автоматически блокируется (`is_banned = True`)
- Все товары магазина становятся недоступными
- Магазин не может принимать новые заказы
- Продавцу отправляется уведомление о блокировке

**Логика порога бана:**
- Порог = 3 отказа (по умолчанию)
- Порог = 4 отказа, если продавец оплачивал штраф **в текущем месяце** (дата `last_penalty_payment_date >= начало текущего месяца`)

**Обоснование:** Если продавец платил штраф в этом месяце, значит он признает проблему и пытается исправиться. Даем ему +1 шанс **на этот месяц**.

### 3. Оплата штрафа

Магазин может снять штрафное очко:
- Оплатив **30% от стоимости ТОВАРА** (цена товара × количество, БЕЗ учета доставки)
- Деньги списываются с баланса магазина (`balance`) и идут платформе
- Автоматический отзыв с 1 звездой удаляется
- Рейтинг магазина пересчитывается без этого отзыва
- Штрафное очко убирается (`penalty_points -= 1`)
- **Ограничение: можно использовать только 1 раз в месяц**
- Дата последней оплаты сохраняется в `last_penalty_payment_date`
- **Бонус:** Если оплатил штраф в текущем месяце, порог бана увеличивается с 3 до 4 отказов подряд
- **Важно:** Это НЕ разблокирует магазин автоматически

### 4. Разблокировка магазина

Для выхода из бана магазин должен:
- Написать в службу поддержки
- Поддержка вручную разблокирует магазин через API
- При разблокировке обнуляется `consecutive_rejections`
- Товары магазина снова становятся доступными

## Модели данных

### Producer (магазин)
```python
penalty_points = models.PositiveIntegerField(default=0)  # Штрафные очки
consecutive_rejections = models.PositiveIntegerField(default=0)  # Подряд отказов
is_banned = models.BooleanField(default=False)  # Заблокирован ли
ban_reason = models.TextField(blank=True)  # Причина блокировки
banned_at = models.DateTimeField(null=True, blank=True)  # Когда заблокирован
unban_date = models.DateTimeField(null=True, blank=True)  # Когда разблокирован
last_penalty_payment_date = models.DateTimeField(null=True, blank=True)  # Дата последней оплаты штрафа
balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Баланс
```

### Review (отзыв)
```python
is_auto_generated = models.BooleanField(default=False)  # Автоматический отзыв при отклонении заказа
```

### Order (заказ)
```python
penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Сумма штрафа
penalty_reason = models.TextField(blank=True)  # Причина штрафа
cancelled_by = models.CharField(max_length=20, choices=CANCELLED_BY_CHOICES)  # Кто отменил
cancelled_reason = models.TextField(blank=True)  # Причина отмены
cancelled_at = models.DateTimeField(null=True, blank=True)  # Когда отменен
```

## API Endpoints

### Просмотр информации о штрафах
```
GET /api/v1/producers/{producer_id}/penalty_info/
```

**Ответ:**
```json
{
  "success": true,
  "penalty_points": 2,
  "consecutive_rejections": 2,
  "is_banned": false,
  "ban_reason": null,
  "balance": 5000.00,
  "last_penalty_payment_date": "2026-01-15T12:00:00Z",
  "next_payment_available_date": "2026-02-15T12:00:00Z",
  "recent_penalties": [
    {
      "order_id": "uuid",
      "penalty_amount": 300.00,
      "order_total": 1000.00,
      "cancelled_at": "2026-01-30T12:00:00Z",
      "penalty_reason": "Отклонение заказа №xxx. 2 подряд."
    }
  ]
}
```

### Оплата штрафа
```
POST /api/v1/producers/{producer_id}/pay_penalty/
Content-Type: application/json

{
  "order_id": "uuid заказа"
}
```

**Ответ при успехе:**
```json
{
  "success": true,
  "message": "Штраф успешно оплачен",
  "penalty_points_remaining": 1,
  "balance_remaining": 4700.00,
  "last_payment_date": "2026-01-30T12:00:00Z",
  "next_payment_available_date": "2026-02-28T12:00:00Z"
}
```

**Ответ при ошибке (месячное ограничение):**
```json
{
  "error": "Оплата штрафа доступна только 1 раз в месяц. Следующая возможная дата: 15.02.2026"
}
```

**Ответ при ошибке (недостаточно средств):**
```json
{
  "error": "Недостаточно средств на балансе. Требуется: 300.00, доступно: 100.00"
}
```

### Принятие заказа (с проверкой блокировки)
```
POST /api/v1/orders/{order_id}/accept/
```

**Ответ при блокировке:**
```json
{
  "error": "Ваш магазин заблокирован. Причина: 3 непринятых заказа подряд. Для разблокировки обратитесь в службу поддержки."
}
```

## Сервисы

### PenaltyService
Расположение: `backend/api/services/penalty_service.py`

**Методы:**
- `apply_order_rejection_penalty(producer, order)` - Применяет штраф при отклонении заказа
- `ban_producer(producer, reason)` - Блокирует магазин
- `pay_penalty_fine(producer, order)` - Оплачивает штраф (списывает с баланса)
- `unban_producer(producer)` - Разблокирует магазин (только для поддержки)

### OrderService
Расположение: `backend/api/services/order_service.py`

**Изменения:**
- `accept_order()` - Добавлена проверка блокировки перед принятием заказа
- `reject_order()` - Автоматически применяет штраф через `PenaltyService`
- `cancel_order_by_seller()` - Применяет штраф при отмене уже принятого заказа

## Логика работы (пошагово)

### Сценарий 1: Отклонение заказа
1. Продавец отклоняет заказ через API
2. `OrderService.reject_order()` вызывает `PenaltyService.apply_order_rejection_penalty()`
3. Увеличивается `penalty_points` и `consecutive_rejections`
4. Если `consecutive_rejections >= 3`, магазин автоматически блокируется
5. Покупателю возвращаются деньги

### Сценарий 2: Оплата штрафа
1. Продавец вызывает API `/api/v1/producers/{id}/pay_penalty/`
2. Указывает ID заказа, за который был штраф
3. Система проверяет баланс магазина
4. Списывает 30% от стоимости заказа
5. Уменьшает `penalty_points` на 1

### Сценарий 3: Попытка принять заказ в бане
1. Продавец пытается принять заказ
2. `OrderService.accept_order()` проверяет `is_banned`
3. Если `True`, возвращается ошибка
4. Продавец должен обратиться в поддержку

### Сценарий 4: Разблокировка (поддержка)
1. Администратор вызывает `PenaltyService.unban_producer()`
2. Устанавливается `is_banned = False`
3. Обнуляется `consecutive_rejections`
4. Все товары магазина становятся доступными
5. Продавцу отправляется уведомление

## Важные замечания

1. **Штрафные очки не обнуляются при разблокировке** - магазин должен оплатить каждое очко отдельно
2. **Оплата штрафа НЕ разблокирует магазин** - нужно обращаться в поддержку
3. **При успешном принятии заказа** счетчик `consecutive_rejections` обнуляется
4. **Штраф применяется при любой отмене продавцом** (как до принятия, так и после)
5. **Баланс магазина должен быть достаточным** для оплаты штрафа

## Тестирование

Для тестирования системы штрафов:

```python
from api.models import Producer, Order
from api.services.penalty_service import PenaltyService

# Создать тестовый сценарий
producer = Producer.objects.get(...)
order = Order.objects.get(...)

penalty_service = PenaltyService()

# Применить штраф
penalty_service.apply_order_rejection_penalty(producer, order)
print(f"Penalty points: {producer.penalty_points}")
print(f"Consecutive rejections: {producer.consecutive_rejections}")

# Оплатить штраф
penalty_service.pay_penalty_fine(producer, order)
print(f"Balance: {producer.balance}")
```
