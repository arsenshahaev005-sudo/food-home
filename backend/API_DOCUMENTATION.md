# API Documentation

Документация по всем реализованным API endpoints и функциям платформы Food Home.

---

## Содержание

1. [Карточки товаров](#1-карточки-товаров)
2. [Оформление и оплата заказов](#2-оформление-и-оплата-заказов)
3. [Претензии и споры](#3-претензии-и-споры)
4. [Отмена заказов](#4-отмена-заказов)
5. [Комиссия и выплаты](#5-комиссия-и-выплаты)
6. [Бонусы и чаевые](#6-бонусы-и-чаевые)
7. [Доставка](#7-доставка)
8. [Оценки](#8-оценки)
9. [Management команды](#9-management-команды)
10. [Примеры использования API](#10-примеры-использования-api)

---

## 1. Карточки товаров

### API Endpoints

#### Получение списка товаров
```
GET /api/v1/dishes/
```

**Параметры запроса:**
- `category` - фильтрация по категории
- `producer` - фильтрация по продавцу
- `is_available` - фильтрация по доступности (true/false)
- `is_top` - только топовые товары
- `is_archived` - включить архивированные товары
- `search` - поиск по названию

**Пример ответа:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "name": "Чизкейк Нью-Йорк",
      "description": "Классический чизкейк с ягодным соусом",
      "price": "450.00",
      "photo": "https://example.com/photo.jpg",
      "is_available": true,
      "is_top": true,
      "is_archived": false,
      "weight": "150г",
      "composition": "Творог, сливки, яйца, сахар",
      "manufacturing_time": "2 часа",
      "shelf_life": "3 дня",
      "storage_conditions": "Хранить при +4°C",
      "dimensions": "15x15x5 см",
      "fillings": "Ягодный соус",
      "sales_count": 150,
      "max_quantity_per_order": 5,
      "start_sales_at": "2024-01-01T00:00:00Z",
      "allow_preorder": true,
      "cooking_time_minutes": 60,
      "discount_percentage": 10,
      "calories": 320,
      "proteins": "8.5",
      "fats": "18.2",
      "carbs": "25.0",
      "rating": 4.8,
      "rating_count": 45,
      "repeat_purchase_count": 12,
      "category": {
        "id": "uuid",
        "name": "Десерты"
      },
      "producer": {
        "id": "uuid",
        "name": "Сладкая жизнь",
        "rating": 4.9
      }
    }
  ]
}
```

#### Получение детальной информации о товаре
```
GET /api/v1/dishes/{id}/
```

**Пример ответа:**
```json
{
  "id": "uuid",
  "name": "Чизкейк Нью-Йорк",
  "description": "Классический чизкейк с ягодным соусом",
  "price": "450.00",
  "photo": "https://example.com/photo.jpg",
  "is_available": true,
  "is_top": true,
  "is_archived": false,
  "weight": "150г",
  "composition": "Творог, сливки, яйца, сахар",
  "manufacturing_time": "2 часа",
  "shelf_life": "3 дня",
  "storage_conditions": "Хранить при +4°C",
  "dimensions": "15x15x5 см",
  "fillings": "Ягодный соус",
  "sales_count": 150,
  "max_quantity_per_order": 5,
  "start_sales_at": "2024-01-01T00:00:00Z",
  "allow_preorder": true,
  "cooking_time_minutes": 60,
  "discount_percentage": 10,
  "calories": 320,
  "proteins": "8.5",
  "fats": "18.2",
  "carbs": "25.0",
  "rating": 4.8,
  "rating_count": 45,
  "repeat_purchase_count": 12,
  "views_count": 1200,
  "in_cart_count": 25,
  "min_quantity": 1,
  "sort_score": 85.5,
  "category": {
    "id": "uuid",
    "name": "Десерты",
    "parent": null
  },
  "producer": {
    "id": "uuid",
    "name": "Сладкая жизнь",
    "description": "Домашняя кондитерская",
    "rating": 4.9,
    "city": "Москва"
  },
  "images": [
    {
      "id": "uuid",
      "image": "https://example.com/photo1.jpg",
      "is_primary": true,
      "sort_order": 0
    },
    {
      "id": "uuid",
      "image": "https://example.com/photo2.jpg",
      "is_primary": false,
      "sort_order": 1
    },
    {
      "id": "uuid",
      "image": "https://example.com/photo3.jpg",
      "is_primary": false,
      "sort_order": 2
    }
  ],
  "toppings": [
    {
      "id": "uuid",
      "name": "Шоколадный соус",
      "price": "50.00"
    }
  ]
}
```

#### Создание товара (для продавца)
```
POST /api/v1/dishes/
```

**Тело запроса:**
```json
{
  "name": "Чизкейк Нью-Йорк",
  "description": "Классический чизкейк с ягодным соусом",
  "price": "450.00",
  "category_id": "uuid",
  "photo": "https://example.com/photo.jpg",
  "is_available": true,
  "is_top": false,
  "is_archived": false,
  "weight": "150г",
  "composition": "Творог, сливки, яйца, сахар",
  "manufacturing_time": "2 часа",
  "shelf_life": "3 дня",
  "storage_conditions": "Хранить при +4°C",
  "dimensions": "15x15x5 см",
  "fillings": "Ягодный соус",
  "max_quantity_per_order": 5,
  "start_sales_at": "2024-01-01T00:00:00Z",
  "allow_preorder": true,
  "cooking_time_minutes": 60,
  "discount_percentage": 10,
  "calories": 320,
  "proteins": 8.5,
  "fats": 18.2,
  "carbs": 25.0,
  "min_quantity": 1,
  "images": [
    {
      "image": "https://example.com/photo1.jpg",
      "is_primary": true,
      "sort_order": 0
    },
    {
      "image": "https://example.com/photo2.jpg",
      "is_primary": false,
      "sort_order": 1
    },
    {
      "image": "https://example.com/photo3.jpg",
      "is_primary": false,
      "sort_order": 2
    }
  ]
}
```

**Валидация 3 фото:**
- Требуется минимум 3 фотографии товара
- Одна фото должна быть помечена как основная (`is_primary: true`)
- Поля `image` должны быть валидными URL

#### Обновление товара (для продавца)
```
PUT /api/v1/dishes/{id}/
PATCH /api/v1/dishes/{id}/
```

#### Архивирование товара
```
PATCH /api/v1/dishes/{id}/
```

**Тело запроса:**
```json
{
  "is_archived": true
}
```

Архивированные товары не отображаются в поиске и каталоге, но остаются доступными для заказов по прямой ссылке.

#### Удаление товара
```
DELETE /api/v1/dishes/{id}/
```

### Сортировка товаров

Товары могут быть отсортированы по следующим полям:
- `sort_score` - общий рейтинг (комбинация оценок, продаж и просмотров)
- `rating` - средняя оценка
- `sales_count` - количество продаж
- `repeat_purchase_count` - количество повторных покупок
- `price` - цена
- `created_at` - дата создания

**Пример:**
```
GET /api/v1/dishes/?ordering=-sort_score,-rating
```

### Ограничения по заказу

- `max_quantity_per_order` - максимальное количество товара в одном заказе
- `min_quantity` - минимальное количество для заказа
- При превышении лимита возвращается ошибка валидации

### Предзаказы

- `allow_preorder` - разрешить предзаказ
- `start_sales_at` - дата начала продаж
- Если `start_sales_at` в будущем, товар доступен только для предзаказа
- Предзаказ автоматически становится обычным заказом после `start_sales_at`

---

## 2. Оформление и оплата заказов

### API Endpoints

#### Создание заказа
```
POST /api/v1/orders/
```

**Тело запроса:**
```json
{
  "dish_id": "uuid",
  "quantity": 2,
  "delivery_type": "DOOR",
  "delivery_address_text": "г. Москва, ул. Примерная, д. 1",
  "apartment": "15",
  "entrance": "2",
  "floor": "5",
  "intercom": "1234",
  "delivery_comment": "Позвонить при прибытии",
  "delivery_latitude": 55.7558,
  "delivery_longitude": 37.6173,
  "selected_toppings": [
    {
      "name": "Шоколадный соус",
      "price": "50.00"
    }
  ],
  "is_gift": false,
  "is_anonymous": false
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Заказ создан",
  "order": {
    "id": "uuid",
    "user_name": "Иван Иванов",
    "phone": "+79001234567",
    "dish": {
      "id": "uuid",
      "name": "Чизкейк Нью-Йорк",
      "price": "450.00"
    },
    "producer": {
      "id": "uuid",
      "name": "Сладкая жизнь"
    },
    "quantity": 2,
    "total_price": "1000.00",
    "status": "WAITING_FOR_PAYMENT",
    "delivery_type": "DOOR",
    "delivery_price": "100.00",
    "delivery_address_text": "г. Москва, ул. Примерная, д. 1",
    "apartment": "15",
    "entrance": "2",
    "floor": "5",
    "intercom": "1234",
    "delivery_comment": "Позвонить при прибытии",
    "delivery_latitude": 55.7558,
    "delivery_longitude": 37.6173,
    "estimated_cooking_time": 60,
    "acceptance_deadline": "2024-01-24T12:30:00Z",
    "created_at": "2024-01-24T12:00:00Z",
    "commission_rate_snapshot": 0.10,
    "commission_amount": "100.00",
    "producer_gross_amount": "900.00",
    "producer_net_amount": "810.00",
    "payable_amount": "1000.00"
  }
}
```

#### Получение списка заказов
```
GET /api/v1/orders/
```

**Параметры запроса:**
- `status` - фильтрация по статусу
- `producer` - фильтрация по продавцу (для администраторов)

**Пример ответа:**
```json
{
  "count": 5,
  "results": [
    {
      "id": "uuid",
      "dish": {
        "id": "uuid",
        "name": "Чизкейк Нью-Йорк"
      },
      "producer": {
        "id": "uuid",
        "name": "Сладкая жизнь"
      },
      "quantity": 2,
      "total_price": "1000.00",
      "status": "WAITING_FOR_ACCEPTANCE",
      "created_at": "2024-01-24T12:00:00Z",
      "acceptance_deadline": "2024-01-24T12:30:00Z"
    }
  ]
}
```

#### Получение детальной информации о заказе
```
GET /api/v1/orders/{id}/
```

#### Принятие заказа продавцом
```
POST /api/v1/orders/{id}/accept/
```

**Тело запроса:**
```json
{
  "order_id": "uuid"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Заказ принят в работу",
  "order": {
    "id": "uuid",
    "status": "COOKING",
    "accepted_at": "2024-01-24T12:15:00Z",
    "ready_at": "2024-01-24T13:15:00Z"
  }
}
```

**Расчёт времени изготовления:**
- `ready_at` = `accepted_at` + `dish.cooking_time_minutes`
- Автоматически рассчитывается при принятии заказа

#### Отклонение заказа продавцом
```
POST /api/v1/orders/{id}/reject/
```

**Тело запроса:**
```json
{
  "order_id": "uuid",
  "reason": "Нет ингредиентов"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Заказ отклонен. Штраф применен.",
  "order": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2024-01-24T12:20:00Z",
    "cancelled_by": "SELLER",
    "cancelled_reason": "Нет ингредиентов"
  },
  "penalty_amount": "100.00"
}
```

**Система штрафов:**
- Штраф 5% от стоимости заказа за отклонение
- Штраф увеличивается при последовательных отклонениях:
  - 1 отклонение: 5%
  - 2 отклонения подряд: 10%
  - 3 отклонения подряд: 15% + бан магазина на 24 часа
- `consecutive_rejections` - счетчик последовательных отклонений

#### Загрузка фото готового товара
```
POST /api/v1/orders/{id}/upload_finished_photo/
```

**Тело запроса:**
```json
{
  "photo_url": "https://example.com/finished_photo.jpg"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Фото загружено",
  "order": {
    "id": "uuid",
    "status": "READY_FOR_REVIEW",
    "finished_photo": "https://example.com/finished_photo.jpg"
  }
}
```

#### Добавление чаевых
```
POST /api/v1/orders/{id}/add_tips/
```

**Тело запроса:**
```json
{
  "amount": 100.00
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Чаевые добавлены",
  "order": {
    "id": "uuid",
    "tips_amount": "100.00",
    "tips_tax_exempt": true,
    "producer_net_amount": "910.00"
  }
}
```

**Особенности:**
- Чаевые можно добавить только для заказов в статусах: `DELIVERING`, `ARRIVED`, `COMPLETED`
- Чаевые освобождены от налога (`tips_tax_exempt: true`)
- Полностью идут продавцу (не учитываются в комиссии)

#### Повторный заказ
```
POST /api/v1/orders/reorder/
```

**Тело запроса:**
```json
{
  "order_id": "uuid"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Заказ повторно добавлен в корзину",
  "cart_items": [
    {
      "dish_id": "uuid",
      "quantity": 2
    }
  ]
}
```

### Статусы заказа

| Статус | Описание |
|--------|----------|
| `WAITING_FOR_PAYMENT` | Ожидание оплаты |
| `WAITING_FOR_RECIPIENT` | Ожидание указания получателя (для подарков) |
| `WAITING_FOR_ACCEPTANCE` | Ожидание принятия продавцом |
| `COOKING` | В приготовлении |
| `READY_FOR_REVIEW` | Готов к проверке (фото загружено) |
| `READY_FOR_DELIVERY` | Готов к доставке |
| `DELIVERING` | В доставке |
| `ARRIVED` | Прибыл к месту назначения |
| `COMPLETED` | Завершен |
| `CANCELLED` | Отменен |
| `DISPUTE` | Открыт спор |

---

## 3. Претензии и споры

### API Endpoints

#### Создание претензии (отметка заказа как неудовлетворительного)
```
POST /api/v1/orders/{id}/mark_unsatisfactory/
```

**Тело запроса:**
```json
{
  "complaint_text": "Товар не соответствует описанию"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Претензия создана",
  "dispute_id": "uuid"
}
```

**Условия:**
- Заказ должен быть в статусе `ARRIVED` или `COMPLETED`
- Только покупатель может создать претензию
- Автоматически открывается спор

#### Получение списка споров
```
GET /api/v1/disputes/
```

**Пример ответа:**
```json
{
  "count": 2,
  "results": [
    {
      "id": "uuid",
      "order": {
        "id": "uuid",
        "dish": {
          "name": "Чизкейк Нью-Йорк"
        }
      },
      "user": {
        "id": "uuid",
        "username": "ivan_ivanov"
      },
      "producer": {
        "id": "uuid",
        "name": "Сладкая жизнь"
      },
      "status": "OPEN",
      "complaint_text": "Товар не соответствует описанию",
      "created_at": "2024-01-24T12:00:00Z",
      "resolved_at": null,
      "resolution": null,
      "refund_amount": null
    }
  ]
}
```

#### Получение детальной информации о споре
```
GET /api/v1/disputes/{id}/
```

**Пример ответа:**
```json
{
  "id": "uuid",
  "order": {
    "id": "uuid",
    "dish": {
      "name": "Чизкейк Нью-Йорк"
    },
    "total_price": "1000.00"
  },
  "user": {
    "id": "uuid",
    "username": "ivan_ivanov"
  },
  "producer": {
    "id": "uuid",
    "name": "Сладкая жизнь"
  },
  "status": "OPEN",
  "complaint_text": "Товар не соответствует описанию",
  "created_at": "2024-01-24T12:00:00Z",
  "resolved_at": null,
  "resolution": null,
  "refund_amount": null,
  "messages": [
    {
      "id": "uuid",
      "sender": "USER",
      "text": "Товар не соответствует описанию",
      "created_at": "2024-01-24T12:00:00Z"
    }
  ]
}
```

#### Добавление сообщения в спор
```
POST /api/v1/disputes/{id}/messages/
```

**Тело запроса:**
```json
{
  "text": "Приношу извинения за недоразумение"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Сообщение добавлено",
  "dispute_message": {
    "id": "uuid",
    "sender": "PRODUCER",
    "text": "Приношу извинения за недоразумение",
    "created_at": "2024-01-24T12:30:00Z"
  }
}
```

#### Разрешение спора (для администратора)
```
POST /api/v1/disputes/{id}/resolve/
```

**Тело запроса:**
```json
{
  "resolution": "FULL_REFUND",
  "refund_amount": "1000.00",
  "compensation_amount": "100.00"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Спор разрешен",
  "dispute": {
    "id": "uuid",
    "status": "RESOLVED",
    "resolution": "FULL_REFUND",
    "refund_amount": "1000.00",
    "compensation_amount": "100.00",
    "resolved_at": "2024-01-24T13:00:00Z"
  }
}
```

### Штрафы и компенсации

#### Штрафы для продавца
- За проигранный спор: 10% от стоимости заказа
- Штраф добавляется к `penalty_amount` в заказе
- Увеличивает `penalty_points` в профиле продавца

#### Компенсации для покупателя
- Полный возврат стоимости заказа (`refund_amount`)
- Дополнительная компенсация (`compensation_amount`) - обычно 10%
- Возврат чаевых при наличии

#### Проблемные покупатели
- `is_problem_buyer` - флаг проблемного покупателя
- `disputes_lost` - количество проигранных споров
- `unjustified_cancellations` - количество необоснованных отмен
- `problem_buyer_reason` - причина пометки как проблемный

---

## 4. Отмена заказов

### API Endpoints

#### Отмена заказа
```
POST /api/v1/orders/{id}/cancel/
```

**Тело запроса:**
```json
{
  "order_id": "uuid",
  "reason": "Изменились планы"
}
```

### Отмена продавцом

**Пример ответа (продавец):**
```json
{
  "success": true,
  "message": "Заказ отменен. Штраф 30% применен.",
  "order": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2024-01-24T12:30:00Z",
    "cancelled_by": "SELLER",
    "cancelled_reason": "Изменились планы"
  },
  "penalty_amount": "300.00"
}
```

**Штрафы для продавца:**
- 30% от стоимости заказа за отмену после принятия
- Штраф вычитается из `producer_net_amount`
- Увеличивает `consecutive_rejections`

**Условия:**
- Только продавец может отменить свой заказ
- Заказ должен быть в статусе `COOKING`, `READY_FOR_DELIVERY`, `DELIVERING`
- Продавец не должен быть забанен

### Отмена покупателем

**Пример ответа (покупатель):**
```json
{
  "success": true,
  "message": "Заказ отменен",
  "order": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2024-01-24T12:30:00Z",
    "cancelled_by": "BUYER",
    "cancelled_reason": "Изменились планы"
  },
  "refund_amount": "1000.00"
}
```

**С компенсацией магазину:**
```json
{
  "success": true,
  "message": "Заказ отменен. Компенсация магазину 10% применена. Остаток средств возвращен.",
  "order": {
    "id": "uuid",
    "status": "CANCELLED",
    "finished_photo": "https://example.com/finished_photo.jpg"
  },
  "refund_amount": "900.00",
  "compensation_amount": "100.00"
}
```

**Компенсации:**
- Если фото готового товара загружено: компенсация 10% магазину, остальное возвращается покупателю
- Если фото не загружено: полный возврат покупателю

**Условия:**
- Только покупатель может отменить свой заказ
- Можно отменить до статуса `DELIVERING`
- После загрузки фото применяется компенсация

---

## 5. Комиссия и выплаты

### Расчёт комиссии

#### Базовая комиссия
- Самозанятый (`SELF_EMPLOYED`): 5%
- ИП (`INDIVIDUAL_ENTREPRENEUR`): 10%

#### Дополнительная комиссия
- `extra_commission_rate` - дополнительный процент для повышения ранжирования
- Может быть установлен продавцом добровольно

#### Итоговая комиссия
```
total_commission_rate = base_commission_rate + (extra_commission_rate / 100)
```

**Пример расчёта:**
```python
# Самозанятый с доп. комиссией 2%
base_commission_rate = 0.05
extra_commission_rate = 2.0
total_commission_rate = 0.05 + (2.0 / 100) = 0.07 (7%)

# Заказ на 1000 руб
total_price = 1000.00
commission_amount = 1000.00 * 0.07 = 70.00
producer_gross_amount = 1000.00 - 70.00 = 930.00
producer_net_amount = 930.00 - penalty_amount + tips_amount
```

### Бонусы за повторных покупателей

#### Отслеживание повторных покупок
- `repeat_purchase_count` - количество повторных покупок блюда
- Автоматически обновляется при завершении заказа
- Учитывается в сортировке товаров

#### Бонусы для продавца
- Снижение комиссии на 1% за каждого 10-го повторного покупателя
- Максимальное снижение: 5%
- Применяется автоматически при расчёте выплат

**Пример:**
```python
# 50 повторных покупателей = 5 снижений = 5% бонус
commission_reduction = min(repeat_customers // 10, 5)
effective_commission = total_commission_rate - (commission_reduction / 100)
```

### Выплаты

#### Создание выплаты
```
POST /api/v1/payouts/
```

**Тело запроса:**
```json
{
  "producer_id": "uuid",
  "amount": "5000.00",
  "payout_frequency": "WEEKLY"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Выплата создана",
  "payout": {
    "id": "uuid",
    "producer": {
      "id": "uuid",
      "name": "Сладкая жизнь"
    },
    "amount": "5000.00",
    "tax_amount": "250.00",
    "status": "PENDING",
    "created_at": "2024-01-24T12:00:00Z",
    "processed_at": null,
    "tax_paid": false,
    "scheduled_for": "2024-01-31T00:00:00Z",
    "next_payout_date": "2024-02-07T00:00:00Z"
  }
}
```

#### Статусы выплаты
- `PENDING` - Ожидает обработки
- `SIGNED` - Подписан (Контур)
- `PAID` - Выплачено
- `FAILED` - Ошибка выплаты

#### Получение списка выплат
```
GET /api/v1/payouts/
```

**Параметры запроса:**
- `producer` - фильтрация по продавцу
- `status` - фильтрация по статусу

### Налоги

#### Расчёт налога
```python
# Для самозанятых: 6% от суммы выплаты
# Для ИП: рассчитывается индивидуально
tax_amount = payout_amount * tax_rate
```

#### Уплата налога
- Автоматический расчёт при создании выплаты
- Возможность ручной уплаты через `tax_payment_id`
- Отслеживание даты уплаты (`tax_payment_date`)

---

## 6. Бонусы и чаевые

### API Endpoints

#### Получение списка повторных покупателей
```
GET /api/v1/producers/{id}/repeat_customers/
```

**Пример ответа:**
```json
{
  "success": true,
  "customers": [
    {
      "user_id": "uuid",
      "name": "Иван Иванов",
      "email": "ivan@example.com",
      "orders_count": 5,
      "total_spent": "5000.00",
      "last_order_date": "2024-01-20T12:00:00Z"
    }
  ]
}
```

#### Получение списка проблемных покупателей
```
GET /api/v1/producers/{id}/problem_buyers/
```

**Пример ответа:**
```json
{
  "success": true,
  "problem_buyers": [
    {
      "user_id": "uuid",
      "name": "Петр Петров",
      "email": "petr@example.com",
      "disputes_lost": 3,
      "unjustified_cancellations": 2,
      "problem_buyer_reason": "Многократные необоснованные претензии"
    }
  ]
}
```

#### Блокировка покупателя
```
POST /api/v1/producers/{id}/block_buyer/
```

**Тело запроса:**
```json
{
  "buyer_id": "uuid"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Покупатель заблокирован"
}
```

#### Разблокировка покупателя
```
POST /api/v1/producers/{id}/unblock_buyer/
```

**Тело запроса:**
```json
{
  "buyer_id": "uuid"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Покупатель разблокирован"
}
```

### Отслеживание повторных покупок

#### Статистика повторных покупок
- `repeat_purchase_count` - количество повторных покупок блюда
- `orders_count` - общее количество заказов покупателя
- `total_spent` - общая сумма потраченных средств
- `last_order_date` - дата последнего заказа

#### Обновление статистики
- Автоматическое обновление при завершении заказа
- Management команда `update_repeat_purchase_stats` для пересчёта

### Расчёт бонусов

#### Бонус за повторных покупателей
```python
# Снижение комиссии на 1% за каждые 10 повторных покупателей
commission_reduction = min(repeat_customers // 10, 5)
effective_commission = total_commission_rate - (commission_reduction / 100)
```

#### Бонус за высокий рейтинг
```python
# Дополнительный бонус для магазинов с рейтингом > 4.8
if producer.rating > 4.8:
    commission_reduction += 1
```

### Чаевые

#### Добавление чаевых
```
POST /api/v1/orders/{id}/add_tips/
```

**Тело запроса:**
```json
{
  "amount": 100.00
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Чаевые добавлены",
  "order": {
    "id": "uuid",
    "tips_amount": "100.00",
    "tips_tax_exempt": true,
    "producer_net_amount": "910.00"
  }
}
```

**Особенности:**
- Чаевые освобождены от налога (`tips_tax_exempt: true`)
- Полностью идут продавцу (не учитываются в комиссии)
- Можно добавить только для доставленных или завершенных заказов

---

## 7. Доставка

### API Endpoints

#### Перенос времени доставки
```
POST /api/v1/orders/{id}/reschedule_delivery/
```

**Тело запроса:**
```json
{
  "new_time": "2024-01-24T14:00:00Z"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Запрос на перенос времени доставки отправлен",
  "order": {
    "id": "uuid",
    "reschedule_requested_by_seller": true,
    "reschedule_new_time": "2024-01-24T14:00:00Z",
    "reschedule_approved_by_buyer": null
  }
}
```

#### Подтверждение переноса доставки
```
POST /api/v1/orders/{id}/approve_reschedule/
```

**Тело запроса:**
```json
{
  "approved": true
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Перенос доставки подтвержден",
  "order": {
    "id": "uuid",
    "reschedule_approved_by_buyer": true,
    "delivery_expected_at": "2024-01-24T14:00:00Z"
  }
}
```

#### Отмена опоздания доставки
```
POST /api/v1/orders/{id}/cancel_late_delivery/
```

**Тело запроса:**
```json
{
  "reason": "Доставка прибыла вовремя"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Опоздание отменено",
  "order": {
    "id": "uuid",
    "delivery_late_minutes": 0,
    "delivery_penalty_applied": false
  }
}
```

### Типы доставки

#### BUILDING (До подъезда)
- Базовая стоимость доставки
- `delivery_price_to_building`

#### DOOR (До двери)
- Повышенная стоимость доставки
- `delivery_price_to_door`

### Опоздания

#### Расчёт опоздания
```python
delivery_late_minutes = max(0, (delivery_actual_arrival_at - delivery_expected_at).total_seconds() / 60)
```

#### Штрафы за опоздания
- До 15 минут: без штрафа
- 15-30 минут: штраф 5% от стоимости заказа
- 30-60 минут: штраф 10% от стоимости заказа
- Более 60 минут: штраф 20% от стоимости заказа

**Пример:**
```python
if delivery_late_minutes <= 15:
    penalty_rate = 0
elif delivery_late_minutes <= 30:
    penalty_rate = 0.05
elif delivery_late_minutes <= 60:
    penalty_rate = 0.10
else:
    penalty_rate = 0.20

penalty_amount = order.total_price * penalty_rate
```

### Настройки доставки продавца

#### Радиус доставки
- `delivery_radius_km` - радиус доставки в километрах
- По умолчанию: 10 км

#### Стоимость доставки
- `delivery_price_to_building` - стоимость до подъезда
- `delivery_price_to_door` - стоимость до двери

#### Время доставки
- `delivery_time_minutes` - стандартное время доставки
- По умолчанию: 60 минут

#### Правила ценообразования
- `delivery_pricing_rules` - правила для ночного/пикового времени
```json
[
  {
    "start": "18:00",
    "end": "21:00",
    "surcharge": 50.0
  }
]
```

#### Зоны доставки
- `delivery_zones` - зоны с разными ценами доставки
```json
[
  {
    "zone_id": "center",
    "name": "Центр",
    "price": "100.00",
    "polygon": [[55.75, 37.61], [55.76, 37.62], [55.75, 37.63]]
  }
]
```

---

## 8. Оценки

### API Endpoints

#### Создание отзыва
```
POST /api/v1/reviews/
```

**Тело запроса:**
```json
{
  "order_id": "uuid",
  "rating": 5,
  "comment": "Отличный чизкейк!"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Отзыв создан",
  "review": {
    "id": "uuid",
    "order": {
      "id": "uuid",
      "dish": {
        "name": "Чизкейк Нью-Йорк"
      }
    },
    "user": {
      "id": "uuid",
      "username": "ivan_ivanov"
    },
    "producer": {
      "id": "uuid",
      "name": "Сладкая жизнь"
    },
    "rating": 5,
    "comment": "Отличный чизкейк!",
    "photo": "https://example.com/review_photo.jpg",
    "created_at": "2024-01-24T12:00:00Z",
    "updated_at": null
  }
}
```

#### Получение списка отзывов
```
GET /api/v1/reviews/
```

**Параметры запроса:**
- `producer` - фильтрация по продавцу
- `rating` - фильтрация по оценке

**Пример ответа:**
```json
{
  "count": 10,
  "results": [
    {
      "id": "uuid",
      "order": {
        "id": "uuid",
        "dish": {
          "name": "Чизкейк Нью-Йорк"
        }
      },
      "user": {
        "id": "uuid",
        "username": "ivan_ivanov"
      },
      "producer": {
        "id": "uuid",
        "name": "Сладкая жизнь"
      },
      "rating": 5,
      "comment": "Отличный чизкейк!",
      "created_at": "2024-01-24T12:00:00Z"
    }
  ]
}
```

#### Получение детальной информации об отзыве
```
GET /api/v1/reviews/{id}/
```

#### Запрос исправления оценки
```
POST /api/v1/reviews/{id}/request_correction/
```

**Тело запроса:**
```json
{
  "refund_amount": "100.00"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Запрос на исправление отправлен",
  "review": {
    "id": "uuid",
    "rating": 3,
    "correction_requested": true,
    "correction_refund_amount": "100.00",
    "correction_requested_at": "2024-01-24T12:00:00Z"
  }
}
```

**Условия:**
- Только продавец может запросить исправление
- Оценка должна быть ниже 4 звезд
- Продавец предлагает возврат части суммы

#### Принятие исправления оценки
```
POST /api/v1/reviews/{id}/accept_correction/
```

**Тело запроса:**
```json
{
  "rating": 5,
  "comment": "Спасибо за компенсацию, всё было вкусно!"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Оценка исправлена",
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "Спасибо за компенсацию, всё было вкусно!",
    "correction_accepted": true,
    "correction_accepted_at": "2024-01-24T12:30:00Z"
  }
}
```

**Условия:**
- Только покупатель может принять исправление
- Новая оценка должна быть выше предыдущей
- Компенсация автоматически возвращается покупателю

#### Отклонение исправления оценки
```
POST /api/v1/reviews/{id}/reject_correction/
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Предложение отклонено",
  "review": {
    "id": "uuid",
    "correction_rejected": true,
    "correction_rejected_at": "2024-01-24T12:30:00Z"
  }
}
```

**Условия:**
- Только покупатель может отклонить исправление
- Оценка остаётся прежней
- Компенсация не возвращается

### Система оценок

#### Шкала оценок
- 1 звезда: Очень плохо
- 2 звезды: Плохо
- 3 звезды: Нормально
- 4 звезды: Хорошо
- 5 звезд: Отлично

#### Расчёт среднего рейтинга
```python
producer.rating = sum(reviews.rating for reviews in producer.reviews) / len(producer.reviews)
dish.rating = sum(reviews.rating for reviews in dish.reviews) / len(dish.reviews)
```

#### Исправление оценок
- Продавец может предложить компенсацию за исправление низкой оценки
- Покупатель может принять или отклонить предложение
- При принятии оценка обновляется, компенсация возвращается

---

## 9. Management команды

### process_order_timeouts

Автоматически отклоняет просроченные заказы с применением штрафа.

**Запуск:**
```bash
python manage.py process_order_timeouts
```

**Параметры:**
- `--dry-run` - показать, что будет сделано, но не выполнять изменения
- `--verbose` - выводить подробную информацию

**Пример:**
```bash
python manage.py process_order_timeouts --verbose
```

**Расписание cron:**
```
*/5 * * * * cd /path/to/project && python manage.py process_order_timeouts
```

**Логика:**
- Находит все заказы в статусе `WAITING_FOR_ACCEPTANCE` с истёкшим `acceptance_deadline`
- Автоматически отклоняет их с причиной "Истекло время принятия заказа"
- Применяет штраф 5% от стоимости заказа
- Увеличивает `consecutive_rejections` для продавца
- При 3 и более отклонениях подряд банит магазин на 24 часа

### process_late_deliveries

Обрабатывает опоздания доставки и применяет штрафы.

**Запуск:**
```bash
python manage.py process_late_deliveries
```

**Параметры:**
- `--dry-run` - показать, что будет сделано, но не выполнять изменения
- `--verbose` - выводить подробную информацию

**Пример:**
```bash
python manage.py process_late_deliveries --verbose
```

**Расписание cron:**
```
*/10 * * * * cd /path/to/project && python manage.py process_late_deliveries
```

**Логика:**
- Находит заказы в статусе `DELIVERING` с `delivery_expected_at` в прошлом
- Рассчитывает `delivery_late_minutes`
- Применяет штрафы в зависимости от времени опоздания:
  - До 15 минут: без штрафа
  - 15-30 минут: штраф 5%
  - 30-60 минут: штраф 10%
  - Более 60 минут: штраф 20%

### update_repeat_purchase_stats

Обновляет статистику повторных покупок.

**Запуск:**
```bash
python manage.py update_repeat_purchase_stats
```

**Расписание cron:**
```
0 2 * * * cd /path/to/project && python manage.py update_repeat_purchase_stats
```

**Логика:**
- Обновляет статистику повторных покупок для всех завершённых заказов
- Рассчитывает `repeat_purchase_count` для каждого блюда
- Обновляет профили покупателей

### run_background_jobs

Запускает все фоновые задачи.

**Запуск:**
```bash
python manage.py run_background_jobs
```

**Расписание cron:**
```
*/5 * * * * cd /path/to/project && python manage.py run_background_jobs
```

**Логика:**
- Запускает все management команды по очереди
- Обрабатывает просроченные заказы
- Обрабатывает опоздания доставки
- Обновляет статистику повторных покупок

### Расписание запуска

**Рекомендуемое расписание cron:**
```
# Обработка просроченных заказов (каждые 5 минут)
*/5 * * * * cd /path/to/project && python manage.py process_order_timeouts >> /var/log/food-home/order_timeouts.log 2>&1

# Обработка опозданий доставки (каждые 10 минут)
*/10 * * * * cd /path/to/project && python manage.py process_late_deliveries >> /var/log/food-home/late_deliveries.log 2>&1

# Обновление статистики повторных покупок (каждую ночь в 2:00)
0 2 * * * cd /path/to/project && python manage.py update_repeat_purchase_stats >> /var/log/food-home/repeat_purchase.log 2>&1

# Обработка истёкших подарков (каждый час)
0 * * * * cd /path/to/project && python manage.py expire_gifts >> /var/log/food-home/expire_gifts.log 2>&1

# Очистка событий Outbox (каждый час)
0 * * * * cd /path/to/project && python manage.py cleanup_outbox_events >> /var/log/food-home/cleanup_outbox.log 2>&1

# Принудительная отмена истёкших заказов (каждые 15 минут)
*/15 * * * * cd /path/to/project && python manage.py auto_cancel_expired_orders >> /var/log/food-home/auto_cancel.log 2>&1

# Принудительное соблюдение SLA приготовления (каждые 5 минут)
*/5 * * * * cd /path/to/project && python manage.py enforce_cooking_sla >> /var/log/food-home/cooking_sla.log 2>&1

# Принудительное соблюдение SLA доставки (каждые 5 минут)
*/5 * * * * cd /path/to/project && python manage.py enforce_delivery_sla >> /var/log/food-home/delivery_sla.log 2>&1
```

---

## 10. Примеры использования API

### Пример 1: Создание заказа и оплата

```bash
# 1. Создание заказа
curl -X POST http://localhost:8000/api/v1/orders/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dish_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 2,
    "delivery_type": "DOOR",
    "delivery_address_text": "г. Москва, ул. Примерная, д. 1",
    "apartment": "15",
    "entrance": "2",
    "floor": "5",
    "intercom": "1234",
    "delivery_comment": "Позвонить при прибытии"
  }'

# Ответ:
{
  "success": true,
  "message": "Заказ создан",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "WAITING_FOR_PAYMENT",
    "total_price": "1000.00",
    "payable_amount": "1000.00"
  }
}

# 2. Оплата заказа
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/pay/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "card"
  }'

# Ответ:
{
  "success": true,
  "message": "Оплата прошла успешно",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "WAITING_FOR_ACCEPTANCE"
  }
}
```

### Пример 2: Принятие заказа продавцом

```bash
# Принятие заказа
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/accept/ \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "660e8400-e29b-41d4-a716-446655440001"
  }'

# Ответ:
{
  "success": true,
  "message": "Заказ принят в работу",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "COOKING",
    "accepted_at": "2024-01-24T12:15:00Z",
    "ready_at": "2024-01-24T13:15:00Z"
  }
}
```

### Пример 3: Загрузка фото готового товара

```bash
# Загрузка фото
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/upload_finished_photo/ \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photo_url": "https://example.com/finished_photo.jpg"
  }'

# Ответ:
{
  "success": true,
  "message": "Фото загружено",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "READY_FOR_REVIEW",
    "finished_photo": "https://example.com/finished_photo.jpg"
  }
}
```

### Пример 4: Добавление чаевых

```bash
# Добавление чаевых
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/add_tips/ \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00
  }'

# Ответ:
{
  "success": true,
  "message": "Чаевые добавлены",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "tips_amount": "100.00",
    "tips_tax_exempt": true,
    "producer_net_amount": "910.00"
  }
}
```

### Пример 5: Создание отзыва

```bash
# Создание отзыва
curl -X POST http://localhost:8000/api/v1/reviews/ \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "660e8400-e29b-41d4-a716-446655440001",
    "rating": 5,
    "comment": "Отличный чизкейк!"
  }'

# Ответ:
{
  "success": true,
  "message": "Отзыв создан",
  "review": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "rating": 5,
    "comment": "Отличный чизкейк!",
    "created_at": "2024-01-24T12:00:00Z"
  }
}
```

### Пример 6: Запрос исправления оценки

```bash
# Запрос исправления (продавец)
curl -X POST http://localhost:8000/api/v1/reviews/770e8400-e29b-41d4-a716-446655440002/request_correction/ \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refund_amount": "100.00"
  }'

# Ответ:
{
  "success": true,
  "message": "Запрос на исправление отправлен",
  "review": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "correction_requested": true,
    "correction_refund_amount": "100.00"
  }
}

# Принятие исправления (покупатель)
curl -X POST http://localhost:8000/api/v1/reviews/770e8400-e29b-41d4-a716-446655440002/accept_correction/ \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Спасибо за компенсацию, всё было вкусно!"
  }'

# Ответ:
{
  "success": true,
  "message": "Оценка исправлена",
  "review": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "rating": 5,
    "comment": "Спасибо за компенсацию, всё было вкусно!",
    "correction_accepted": true
  }
}
```

### Пример 7: Отмена заказа покупателем

```bash
# Отмена заказа
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/cancel/ \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "660e8400-e29b-41d4-a716-446655440001",
    "reason": "Изменились планы"
  }'

# Ответ (без фото):
{
  "success": true,
  "message": "Заказ отменен",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "CANCELLED"
  },
  "refund_amount": "1000.00"
}

# Ответ (с фото):
{
  "success": true,
  "message": "Заказ отменен. Компенсация магазину 10% применена. Остаток средств возвращен.",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "CANCELLED",
    "finished_photo": "https://example.com/finished_photo.jpg"
  },
  "refund_amount": "900.00",
  "compensation_amount": "100.00"
}
```

### Пример 8: Создание претензии

```bash
# Создание претензии
curl -X POST http://localhost:8000/api/v1/orders/660e8400-e29b-41d4-a716-446655440001/mark_unsatisfactory/ \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "complaint_text": "Товар не соответствует описанию"
  }'

# Ответ:
{
  "success": true,
  "message": "Претензия создана",
  "dispute_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

### Пример 9: Получение списка повторных покупателей

```bash
# Получение списка повторных покупателей
curl -X GET http://localhost:8000/api/v1/producers/550e8400-e29b-41d4-a716-446655440000/repeat_customers/ \
  -H "Authorization: Bearer SELLER_TOKEN"

# Ответ:
{
  "success": true,
  "customers": [
    {
      "user_id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Иван Иванов",
      "email": "ivan@example.com",
      "orders_count": 5,
      "total_spent": "5000.00",
      "last_order_date": "2024-01-20T12:00:00Z"
    }
  ]
}
```

### Пример 10: Создание товара

```bash
# Создание товара
curl -X POST http://localhost:8000/api/v1/dishes/ \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Чизкейк Нью-Йорк",
    "description": "Классический чизкейк с ягодным соусом",
    "price": "450.00",
    "category_id": "550e8400-e29b-41d4-a716-446655440005",
    "photo": "https://example.com/photo.jpg",
    "is_available": true,
    "is_top": false,
    "is_archived": false,
    "weight": "150г",
    "composition": "Творог, сливки, яйца, сахар",
    "manufacturing_time": "2 часа",
    "shelf_life": "3 дня",
    "storage_conditions": "Хранить при +4°C",
    "dimensions": "15x15x5 см",
    "fillings": "Ягодный соус",
    "max_quantity_per_order": 5,
    "allow_preorder": true,
    "cooking_time_minutes": 60,
    "discount_percentage": 10,
    "calories": 320,
    "proteins": 8.5,
    "fats": 18.2,
    "carbs": 25.0,
    "min_quantity": 1,
    "images": [
      {
        "image": "https://example.com/photo1.jpg",
        "is_primary": true,
        "sort_order": 0
      },
      {
        "image": "https://example.com/photo2.jpg",
        "is_primary": false,
        "sort_order": 1
      },
      {
        "image": "https://example.com/photo3.jpg",
        "is_primary": false,
        "sort_order": 2
      }
    ]
  }'

# Ответ:
{
  "success": true,
  "message": "Товар создан",
  "dish": {
    "id": "a00e8400-e29b-41d4-a716-446655440006",
    "name": "Чизкейк Нью-Йорк",
    "price": "450.00",
    "is_available": true
  }
}
```

---

## Дополнительная информация

### Аутентификация

Все API endpoints требуют аутентификации через JWT токен.

**Пример заголовка:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Пагинация

Все list endpoints поддерживают пагинацию.

**Пример ответа:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/dishes/?page=2",
  "previous": null,
  "results": [...]
}
```

### Фильтрация

Многие endpoints поддерживают фильтрацию по параметрам.

**Пример:**
```
GET /api/v1/dishes/?category=uuid&is_available=true&ordering=-rating
```

### Обработка ошибок

Все API возвращают стандартизированные ошибки.

**Пример ответа с ошибкой:**
```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": {
    "field_name": ["Specific error details"]
  },
  "error_code": "VALIDATION_ERROR"
}
```

### Статусы HTTP

- `200 OK` - Успешный запрос
- `201 Created` - Ресурс создан
- `400 Bad Request` - Ошибка валидации
- `401 Unauthorized` - Требуется аутентификация
- `403 Forbidden` - Нет прав доступа
- `404 Not Found` - Ресурс не найден
- `422 Unprocessable Entity` - Ошибка обработки данных
- `500 Internal Server Error` - Внутренняя ошибка сервера

---

## Контакты

Для вопросов и предложений по API обращайтесь:
- Email: support@food-home.com
- Документация обновляется: 2024-01-24
