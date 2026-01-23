"""
Новые модели для улучшений со средним приоритетом.
Этот файл будет объединен с models.py после создания миграций.
"""

from django.db import models
import uuid
from django.conf import settings
from .models import Producer, Dish, Order, Category


class SavedCartItem(models.Model):
    """Модель для сохраненных товаров пользователя (для покупки позже)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_cart_items"
    )
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    selected_toppings = models.JSONField(
        default=list, blank=True, help_text="List of {name, price} selected toppings"
    )
    notes = models.TextField(blank=True, help_text="Notes from user")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["user", "dish", "selected_toppings"]]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user} saved {self.dish.name} (x{self.quantity})"


class MessageTemplate(models.Model):
    """Шаблоны частых вопросов для чата."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(
        Producer,
        on_delete=models.CASCADE,
        related_name="message_templates"
    )
    title = models.CharField(max_length=255, help_text="Название шаблона")
    content = models.TextField(help_text="Текст сообщения")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Порядок отображения")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.producer.name}: {self.title}"


class CommunicationRating(models.Model):
    """Оценка качества общения между пользователями."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="communication_ratings"
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_communication_ratings"
    )
    rated_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_communication_ratings"
    )
    rating = models.PositiveIntegerField(
        help_text="Оценка от 1 до 5"
    )
    comment = models.TextField(blank=True, help_text="Комментарий к оценке")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["order", "rater", "rated_user"]]

    def __str__(self):
        return f"{self.rater} rated {self.rated_user}: {self.rating}/5"


class SubscriptionOrder(models.Model):
    """Модель для подписок на регулярные заказы."""
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("PAUSED", "Paused"),
        ("CANCELLED", "Cancelled"),
        ("COMPLETED", "Completed"),
    ]

    FREQUENCY_CHOICES = [
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("BIWEEKLY", "Biweekly"),
        ("MONTHLY", "Monthly"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_orders"
    )
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    selected_toppings = models.JSONField(
        default=list, blank=True, help_text="List of {name, price} selected toppings"
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default="WEEKLY"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE"
    )
    start_date = models.DateField(help_text="Дата начала подписки")
    next_delivery_date = models.DateField(help_text="Дата следующей доставки")
    end_date = models.DateField(null=True, blank=True, help_text="Дата окончания подписки")
    delivery_address_text = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["next_delivery_date"]),
        ]

    def __str__(self):
        return f"{self.user} subscription for {self.dish.name} ({self.frequency})"


class ReferralBonus(models.Model):
    """Модель для реферальных бонусов."""
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("EARNED", "Earned"),
        ("PAID", "Paid"),
        ("EXPIRED", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_bonuses_given"
    )
    referee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_bonuses_received",
        null=True,
        blank=True
    )
    referral_code = models.CharField(max_length=50, unique=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )
    bonus_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Сумма бонуса"
    )
    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Минимальная сумма заказа для получения бонуса"
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["referrer", "status"]),
            models.Index(fields=["referral_code"]),
        ]

    def __str__(self):
        return f"Referral {self.referral_code} by {self.referrer}"


class LimitedOffer(models.Model):
    """Модель для лимитированных предложений."""
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ACTIVE", "Active"),
        ("PAUSED", "Paused"),
        ("EXPIRED", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(
        Producer,
        on_delete=models.CASCADE,
        related_name="limited_offers"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dishes = models.ManyToManyField(Dish, related_name="limited_offers")
    discount_percentage = models.PositiveIntegerField(
        default=0,
        help_text="Скидка в процентах (0-100)"
    )
    max_quantity = models.PositiveIntegerField(
        help_text="Максимальное количество предложений"
    )
    current_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Текущее количество проданных"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT"
    )
    start_at = models.DateTimeField(help_text="Время начала предложения")
    end_at = models.DateTimeField(help_text="Время окончания предложения")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["producer", "status"]),
            models.Index(fields=["start_at", "end_at"]),
        ]

    def __str__(self):
        return f"{self.producer.name}: {self.title} ({self.current_quantity}/{self.max_quantity})"


class Recommendation(models.Model):
    """Модель для рекомендаций пользователям."""
    TYPE_CHOICES = [
        ("ORDER_HISTORY", "Based on Order History"),
        ("SIMILAR_ITEMS", "Similar Items"),
        ("FREQUENTLY_BOUGHT", "Frequently Bought Together"),
        ("SEASONAL", "Seasonal"),
        ("LOCATION_BASED", "Location Based"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recommendations"
    )
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE)
    recommendation_type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default="ORDER_HISTORY"
    )
    score = models.FloatField(
        default=0.0,
        help_text="Релевантность рекомендации"
    )
    reason = models.TextField(blank=True, help_text="Причина рекомендации")
    is_shown = models.BooleanField(default=False)
    is_clicked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-score"]),
            models.Index(fields=["user", "is_shown"]),
        ]

    def __str__(self):
        return f"Recommendation for {self.user}: {self.dish.name} ({self.score})"


class UserPreference(models.Model):
    """Модель для предпочтений пользователя."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences"
    )
    favorite_categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name="preferred_by_users"
    )
    disliked_categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name="disliked_by_users"
    )
    favorite_producers = models.ManyToManyField(
        Producer,
        blank=True,
        related_name="preferred_by_users"
    )
    dietary_restrictions = models.JSONField(
        default=list,
        blank=True,
        help_text="Список диетических ограничений"
    )
    price_range_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    price_range_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    spicy_preference = models.CharField(
        max_length=20,
        blank=True,
        help_text="Предпочтение по остроте: none, mild, medium, hot"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user}"


class PersonalizedOffer(models.Model):
    """Модель для индивидуальных скидок и предложений."""
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SENT", "Sent"),
        ("VIEWED", "Viewed"),
        ("USED", "Used"),
        ("EXPIRED", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personalized_offers"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    offer_type = models.CharField(
        max_length=50,
        help_text="Тип предложения: discount, free_delivery, gift"
    )
    discount_percentage = models.PositiveIntegerField(
        default=0,
        help_text="Скидка в процентах (0-100)"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Фиксированная скидка"
    )
    dishes = models.ManyToManyField(
        Dish,
        blank=True,
        related_name="personalized_offers"
    )
    min_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT"
    )
    valid_from = models.DateTimeField(help_text="Время начала действия")
    valid_until = models.DateTimeField(help_text="Время окончания действия")
    sent_at = models.DateTimeField(null=True, blank=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["valid_from", "valid_until"]),
        ]

    def __str__(self):
        return f"Offer for {self.user}: {self.title}"
