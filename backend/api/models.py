import uuid

import django.utils.timezone
from django.conf import settings
from django.db import models

from core.validators import (
    DeliveryPricingRulesValidator,
    DeliveryZonesValidator,
    DocumentsValidator,
    EmployeesValidator,
    RequisitesValidator,
    WeeklyScheduleValidator,
)

# Define validator instances as callable classes for migration compatibility
weekly_schedule_validator = WeeklyScheduleValidator()
delivery_pricing_rules_validator = DeliveryPricingRulesValidator()
delivery_zones_validator = DeliveryZonesValidator()
requisites_validator = RequisitesValidator()
employees_validator = EmployeesValidator()
documents_validator = DocumentsValidator()


class Producer(models.Model):
    PRODUCER_TYPES = [
        ("SELF_EMPLOYED", "Self Employed (5%)"),
        ("INDIVIDUAL_ENTREPRENEUR", "Individual Entrepreneur (10%)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="producer",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=255, blank=True)
    logo_url = models.URLField(blank=True)
    main_category = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="main_producers",
    )
    rating = models.FloatField(default=0)
    city = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True)

    # New fields for logic
    opening_time = models.TimeField(default="09:00")
    closing_time = models.TimeField(default="21:00")
    penalty_points = models.PositiveIntegerField(default=0)  # "Единицы" штрафов
    consecutive_rejections = models.PositiveIntegerField(default=0)
    is_banned = models.BooleanField(default=False)
    last_penalty_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Дата последней оплаты штрафа"
    )

    # Status & Schedule
    is_hidden = models.BooleanField(default=False)  # Archive/Hide from list
    # Simple JSON/Text for breaks. E.g. "Sat-Sun off, Lunch 13-14"
    schedule_description = models.TextField(
        blank=True, help_text="Text description of breaks/weekends"
    )
    weekly_schedule = models.JSONField(
        default=list, blank=True, validators=[weekly_schedule_validator]
    )

    # Delivery Config
    delivery_radius_km = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.0
    )
    delivery_price_to_building = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.0
    )
    delivery_price_to_door = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.0
    )
    delivery_time_minutes = models.PositiveIntegerField(default=60)
    max_orders_per_slot = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of scheduled orders per time slot (0 = unlimited)"
    )
    # JSON list of rules: [{"start": "18:00", "end": "21:00", "surcharge": 50.0}]
    delivery_pricing_rules = models.JSONField(
        default=list, blank=True, validators=[delivery_pricing_rules_validator]
    )
    delivery_zones = models.JSONField(
        default=list, blank=True, validators=[delivery_zones_validator]
    )
    pickup_enabled = models.BooleanField(default=False)
    requisites = models.JSONField(
        default=dict, blank=True, validators=[requisites_validator]
    )
    employees = models.JSONField(
        default=list, blank=True, validators=[employees_validator]
    )
    documents = models.JSONField(
        default=list, blank=True, validators=[documents_validator]
    )

    # Finance & Ranking
    producer_type = models.CharField(
        max_length=50, choices=PRODUCER_TYPES, default="SELF_EMPLOYED"
    )
    extra_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Extra % to boost ranking",
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    rating_count = models.PositiveIntegerField(default=0)

    # Ban fields
    ban_reason = models.TextField(blank=True)
    banned_at = models.DateTimeField(null=True, blank=True)
    unban_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=django.utils.timezone.now)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )

    @property
    def base_commission_rate(self):
        return 0.10 if self.producer_type == "INDIVIDUAL_ENTREPRENEUR" else 0.05

    @property
    def total_commission_rate(self):
        return (
            float(self.base_commission_rate) + float(self.extra_commission_rate) / 100.0
        )

    def __str__(self):
        return self.name


class Payout(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SIGNED", "Signed (Kontur)"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="payouts"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    tax_paid = models.BooleanField(default=False)
    tax_payment_id = models.CharField(max_length=255, blank=True)
    tax_payment_date = models.DateTimeField(null=True, blank=True)
    kontur_sign_status = models.CharField(max_length=50, blank=True)
    kontur_sign_date = models.DateTimeField(null=True, blank=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    payout_frequency = models.CharField(max_length=20, default="WEEKLY")
    next_payout_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payout {self.id} for {self.producer.name}"


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subcategories",
    )

    def __str__(self):
        return self.name


class Dish(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="dishes"
    )
    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="dishes"
    )
    photo = models.URLField(blank=True)  # Main photo
    is_available = models.BooleanField(default=True)

    # New fields
    is_top = models.BooleanField(default=False)
    weight = models.CharField(max_length=50, blank=True)
    composition = models.TextField(blank=True)
    manufacturing_time = models.CharField(max_length=100, blank=True)
    shelf_life = models.CharField(max_length=100, blank=True)
    storage_conditions = models.TextField(blank=True)
    dimensions = models.CharField(max_length=100, blank=True)
    fillings = models.TextField(blank=True)
    is_archived = models.BooleanField(default=False)
    sales_count = models.PositiveIntegerField(default=0)
    max_quantity_per_order = models.PositiveIntegerField(null=True, blank=True)
    start_sales_at = models.DateTimeField(null=True, blank=True)
    allow_preorder = models.BooleanField(default=True)

    # Logic field
    cooking_time_minutes = models.PositiveIntegerField(
        default=60, help_text="Time in minutes to cook this dish"
    )
    discount_percentage = models.PositiveIntegerField(
        default=0, help_text="Discount percentage (0-100)"
    )

    # BJU (Nutritional value) per 100g
    calories = models.PositiveIntegerField(default=0, help_text="Calories per 100g")
    proteins = models.DecimalField(
        max_digits=5, decimal_places=1, default=0.0, help_text="Proteins per 100g"
    )
    fats = models.DecimalField(
        max_digits=5, decimal_places=1, default=0.0, help_text="Fats per 100g"
    )
    carbs = models.DecimalField(
        max_digits=5, decimal_places=1, default=0.0, help_text="Carbohydrates per 100g"
    )

    # Stats
    views_count = models.PositiveIntegerField(default=0)
    in_cart_count = models.PositiveIntegerField(default=0)
    min_quantity = models.PositiveIntegerField(default=1)
    rating = models.FloatField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    sort_score = models.FloatField(default=0)
    repeat_purchase_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name


class DishImage(models.Model):
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="images")
    image = models.URLField()
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Image for {self.dish.name}"


class PromoCode(models.Model):
    TYPE_CHOICES = [
        ("DISCOUNT", "Discount Amount"),
        ("FREE_DELIVERY", "Free Delivery"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="promo_codes"
    )
    code = models.CharField(max_length=50)
    reward_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reward_value = models.CharField(
        max_length=255, blank=True
    )  # "100.00" or "Chocolate Cookie"
    recipient_phone = models.CharField(max_length=50)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    sms_sent = models.BooleanField(default=False)
    sms_sent_at = models.DateTimeField(null=True, blank=True)
    sms_status = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.code} ({self.reward_type})"


class DishTopping(models.Model):
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="toppings")
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} for {self.dish.name} (+{self.price} ₽)"


class Order(models.Model):
    STATUS_CHOICES = [
        ("WAITING_FOR_PAYMENT", "Waiting for Payment"),
        ("WAITING_FOR_ACCEPTANCE", "Waiting for Acceptance"),
        ("COOKING", "Cooking"),
        ("READY_FOR_REVIEW", "Ready for Review (Photo Uploaded)"),
        ("READY_FOR_DELIVERY", "Ready for Delivery"),
        ("DELIVERING", "Delivering"),
        ("ARRIVED", "Arrived at Destination"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("DISPUTE", "Dispute Open"),
    ]

    CANCELLED_BY_CHOICES = [
        ("BUYER", "Buyer"),
        ("SELLER", "Seller"),
        ("ADMIN", "Admin"),
        ("SYSTEM", "System"),
    ]

    DELIVERY_TYPE_CHOICES = [
        ("BUILDING", "To Building"),
        ("DOOR", "To Door"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_name = models.CharField(
        max_length=255
    )  # Can be linked to User model directly too
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
    )
    phone = models.CharField(max_length=50)
    dish = models.ForeignKey(
        Dish, on_delete=models.CASCADE, related_name="orders"
    )  # Legacy single dish, kept for now
    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="orders", null=True, blank=True
    )
    # Ideally should use OrderItems for multi-dish, but sticking to
    # existing structure mostly
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default="WAITING_FOR_PAYMENT"
    )
    is_urgent = models.BooleanField(default=False)

    # Delivery Info
    delivery_type = models.CharField(
        max_length=20, choices=DELIVERY_TYPE_CHOICES, default="BUILDING"
    )
    delivery_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_address_text = models.TextField(blank=True, default="")
    apartment = models.CharField(max_length=50, blank=True, default="")
    entrance = models.CharField(max_length=50, blank=True, default="")
    floor = models.CharField(max_length=50, blank=True, default="")
    intercom = models.CharField(max_length=50, blank=True, default="")
    delivery_comment = models.TextField(blank=True, default="")

    # Promo
    applied_promo_code = models.ForeignKey(
        PromoCode, on_delete=models.SET_NULL, null=True, blank=True
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    acceptance_deadline = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(
        max_length=20, choices=CANCELLED_BY_CHOICES, null=True, blank=True
    )
    cancelled_reason = models.TextField(blank=True)
    cancellation_penalty_applied = models.BooleanField(default=False)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    estimated_cooking_time = models.PositiveIntegerField(
        default=0, help_text="Total minutes"
    )
    finished_photo = models.URLField(blank=True, null=True)
    selected_toppings = models.JSONField(
        default=list, blank=True, help_text="List of {name, price} selected toppings"
    )

    # Financial snapshots
    tips_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tips_tax_exempt = models.BooleanField(default=True)
    commission_rate_snapshot = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.0
    )  # stored as 0.05 for 5%
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    penalty_reason = models.TextField(blank=True)
    producer_gross_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    producer_net_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    refunded_total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    refunded_tips_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    refunded_commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    payable_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout_status = models.CharField(
        max_length=20,
        choices=[
            ("NOT_ACCRUED", "Not Accrued"),
            ("ACCRUED", "Accrued"),
            ("PAID_OUT", "Paid Out"),
        ],
        default="NOT_ACCRUED",
    )
    payout_accrued_at = models.DateTimeField(null=True, blank=True)
    payout_paid_at = models.DateTimeField(null=True, blank=True)

    delivery_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    delivery_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    delivery_expected_at = models.DateTimeField(null=True, blank=True)
    delivery_actual_arrival_at = models.DateTimeField(null=True, blank=True)
    delivery_late_minutes = models.PositiveIntegerField(default=0)
    delivery_penalty_applied = models.BooleanField(default=False)

    # Scheduled delivery
    scheduled_delivery_time = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Customer's requested delivery time. NULL = ASAP delivery"
    )

    # Rescheduling logic
    reschedule_requested_by_seller = models.BooleanField(default=False)
    reschedule_new_time = models.DateTimeField(null=True, blank=True)
    reschedule_approved_by_buyer = models.BooleanField(
        null=True, blank=True
    )  # None=Pending, True=Yes, False=No
    tinkoff_payment_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True
    )
    current_payment = models.ForeignKey(
        "Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_for_orders",
    )

    # Gift order fields
    is_gift = models.BooleanField(default=False, help_text="Whether this is a gift order")
    is_anonymous = models.BooleanField(
        default=False, help_text="Whether the sender should be hidden from recipient"
    )
    recipient_phone = models.CharField(
        max_length=50, blank=True, default="", help_text="Phone number of gift recipient"
    )
    recipient_name = models.CharField(
        max_length=255, blank=True, default="", help_text="Name of gift recipient"
    )
    recipient_address_text = models.TextField(
        blank=True, default="", help_text="Delivery address for gift recipient"
    )
    recipient_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True,
        help_text="Latitude of recipient address"
    )
    recipient_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True,
        help_text="Longitude of recipient address"
    )
    recipient_specified_time = models.DateTimeField(
        null=True, blank=True, help_text="When recipient specified delivery time"
    )
    gift_proof_image = models.URLField(
        blank=True, null=True, help_text="Proof photo that gift was delivered"
    )
    recipient_token = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Token for recipient to specify delivery details"
    )
    recipient_token_expires_at = models.DateTimeField(
        null=True, blank=True, help_text="When recipient token expires"
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["producer", "status"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["tinkoff_payment_id"]),
        ]

    def __str__(self):
        return f"{self.user_name} - {self.dish.name} ({self.status})"


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="review")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    producer = models.ForeignKey(
        Producer, on_delete=models.CASCADE, related_name="reviews"
    )

    rating_taste = models.PositiveIntegerField(default=5)
    rating_appearance = models.PositiveIntegerField(default=5)
    rating_service = models.PositiveIntegerField(default=5)
    comment = models.TextField(blank=True)

    photo = models.URLField(blank=True, null=True)
    video = models.URLField(blank=True, null=True, help_text="URL к видео отзыва")
    is_auto_generated = models.BooleanField(
        default=False,
        help_text="Автоматически созданный отзыв при отклонении заказа продавцом"
    )

    # Detailed ratings for specific aspects
    rating_portion = models.PositiveIntegerField(
        default=5,
        help_text="Оценка размера порции (1-5)"
    )
    rating_packaging = models.PositiveIntegerField(
        default=5,
        help_text="Оценка упаковки (1-5)"
    )

    # Seller response
    seller_response = models.TextField(
        blank=True,
        help_text="Ответ продавца на отзыв"
    )
    seller_response_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Время ответа продавца"
    )

    # Correction Logic
    is_updated = models.BooleanField(default=False)
    refund_offered_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    refund_accepted = models.BooleanField(default=False)

    # Original rating fields for correction tracking
    original_rating_taste = models.PositiveIntegerField(null=True, blank=True)
    original_rating_appearance = models.PositiveIntegerField(null=True, blank=True)
    original_rating_service = models.PositiveIntegerField(null=True, blank=True)
    correction_requested_at = models.DateTimeField(null=True, blank=True)
    correction_approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review for {self.order.id}"


class Dispute(models.Model):
    REASON_CHOICES = [
        ("QUALITY", "Quality Issue"),
        ("NOT_RECEIVED", "Not Received"),
        ("OTHER", "Other"),
    ]
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("WAITING_SELLER", "Waiting Seller"),
        ("WAITING_SUPPORT", "Waiting Support"),
        ("RESOLVED_BUYER_WON", "Resolved (Buyer Won)"),
        ("RESOLVED_SELLER_WON", "Resolved (Seller Won)"),
        ("RESOLVED_PARTIAL", "Resolved (Partial Refund)"),
        ("CANCELLED", "Cancelled"),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="disputes", null=True, blank=True
    )
    review = models.ForeignKey(
        Review, on_delete=models.CASCADE, related_name="disputes", null=True, blank=True
    )
    opened_by = models.CharField(max_length=20, default="BUYER")
    opened_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opened_disputes",
    )
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    description = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="OPEN")
    created_at = models.DateTimeField(auto_now_add=True)
    resolution_notes = models.TextField(blank=True)
    compensation_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    resolved_at = models.DateTimeField(null=True, blank=True)


class Payment(models.Model):
    class Provider(models.TextChoices):
        DEV_FAKE = "DEV_FAKE"
        TINKOFF = "TINKOFF"
        SBP = "SBP"

    class Status(models.TextChoices):
        INITIATED = "INITIATED"
        PENDING = "PENDING"
        SUCCEEDED = "SUCCEEDED"
        FAILED = "FAILED"
        REFUNDED = "REFUNDED"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
        CANCELLED = "CANCELLED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        "Order", on_delete=models.PROTECT, related_name="payments"
    )

    provider = models.CharField(
        max_length=20, choices=Provider.choices, default=Provider.DEV_FAKE
    )
    provider_payment_id = models.CharField(max_length=255, blank=True, null=True)
    provider_raw_response = models.JSONField(default=dict, blank=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="RUB")

    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.INITIATED
    )
    error_code = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)

    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Dispute for {self.order.id}"



class OutboxEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aggregate_type = models.CharField(max_length=64)
    aggregate_id = models.UUIDField()
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    status = models.CharField(max_length=16, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    dead_letter = models.BooleanField(default=False)

    def __str__(self):
        return f"OutboxEvent {self.id}"

    class Meta:
        indexes = [
            models.Index(fields=["status", "next_attempt_at"]),
            models.Index(fields=["status", "created_at"]),
        ]


class PublishedEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outbox_event = models.OneToOneField(
        OutboxEvent,
        on_delete=models.CASCADE,
        related_name="publication",
    )
    topic = models.CharField(max_length=64)
    published_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PublishedEvent {self.id}"


class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ("TEXT", "Text"),
        ("IMAGE", "Image"),
        ("VIDEO", "Video"),
        ("FILE", "File"),
        ("CALL_START", "Call Start"),
        ("CALL_END", "Call End"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="messages", null=True, blank=True
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_messages",
    )

    content = models.TextField(blank=True)
    attachment = models.URLField(blank=True, null=True)
    message_type = models.CharField(
        max_length=20, choices=MESSAGE_TYPES, default="TEXT"
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message {self.id} from {self.sender}"


class ChatComplaint(models.Model):
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_made",
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_against",
    )
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)


class Address(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    city = models.CharField(max_length=255)
    street = models.CharField(max_length=255)
    house = models.CharField(max_length=50)
    apartment = models.CharField(max_length=50, blank=True, null=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )

    def __str__(self):
        return f"{self.city}, {self.street} {self.house}"


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart"
    )

    def add_item(self, dish, quantity=1, selected_toppings=None):
        if selected_toppings is None:
            selected_toppings = []

        item, created = self.items.get_or_create(
            dish=dish,
            selected_toppings=selected_toppings,
            defaults={
                "quantity": quantity,
                "price_at_the_moment": dish.price,
            },
        )
        if not created:
            item.quantity = item.quantity + quantity
            item.price_at_the_moment = dish.price
            item.save()
        return item, created

    def remove_item(self, dish):
        try:
            item = self.items.get(dish=dish)
            item.delete()
            return True
        except CartItem.DoesNotExist:
            return False

    def clear(self):
        self.items.all().delete()


class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_the_moment = models.DecimalField(max_digits=10, decimal_places=2)
    selected_toppings = models.JSONField(
        default=list, blank=True, help_text="List of {name, price} selected toppings"
    )

    class Meta:
        # Removed unique_together because same dish can have different toppings
        pass


class VerificationCode(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verification_codes",
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        import datetime

        from django.utils import timezone

        return not self.is_used and (
            timezone.now() - self.created_at
        ) < datetime.timedelta(minutes=10)


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    phone = models.CharField(max_length=20, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
    auth_provider = models.CharField(max_length=20, blank=True, default="LOCAL")

    # New fields for buyer stats
    disputes_lost = models.PositiveIntegerField(default=0)
    unjustified_cancellations = models.PositiveIntegerField(default=0)

    # Repeat purchase stats
    total_orders = models.PositiveIntegerField(default=0)
    repeated_orders = models.PositiveIntegerField(default=0)
    repeat_purchase_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Problem buyer fields
    is_problem_buyer = models.BooleanField(default=False)
    problem_buyer_reason = models.TextField(blank=True)
    blocked_by_producers = models.JSONField(default=list, blank=True)


class PendingRegistration(models.Model):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    password = models.CharField(
        max_length=128
    )  # Store hashed password or raw? Better hash it before saving or just raw for temp
    # Actually, we can store raw and let User.objects.create_user hash it.
    # But for security, if this table leaks, raw passwords are bad.
    # Let's store raw for now as it's a temp table and short lived.
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, default="CLIENT")
    shop_name = models.CharField(max_length=255, blank=True)
    verification_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        import datetime

        from django.utils import timezone

        return (timezone.now() - self.created_at) < datetime.timedelta(minutes=30)


class PendingChange(models.Model):
    TYPES = [
        ("EMAIL", "Email"),
        ("PHONE", "Phone"),
        ("PASSWORD", "Password"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pending_changes",
    )
    change_type = models.CharField(max_length=20, choices=TYPES)
    new_value = models.CharField(max_length=255, blank=True)
    verification_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        import datetime

        from django.utils import timezone

        return (timezone.now() - self.created_at) < datetime.timedelta(minutes=10)


class PaymentMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_methods",
    )
    card_type = models.CharField(max_length=50)  # Visa, Mastercard, Mir
    last_four = models.CharField(max_length=4)
    exp_month = models.CharField(max_length=2)
    exp_year = models.CharField(max_length=4)
    is_default = models.BooleanField(default=False)
    provider_token = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.card_type} *{self.last_four}"


class UserDevice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="devices"
    )
    name = models.CharField(max_length=255)  # iPhone 12, Chrome on Windows
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)
    is_current = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.ip_address})"


class Notification(models.Model):
    TYPES = [
        ("ORDER", "Order Update"),
        ("SYSTEM", "System Message"),
        ("PROMO", "Promotion"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPES, default="SYSTEM")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.title


class HelpArticle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.CharField(max_length=255)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    category = models.CharField(max_length=100, default="General")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.question


class SearchHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="search_history",
    )
    query = models.CharField(max_length=255)
    results_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Search by {self.user} for '{self.query}'"


class SavedSearch(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    name = models.CharField(max_length=255)
    query_params = models.JSONField(help_text="JSON representation of search filters")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Saved search '{self.name}' by {self.user}"


class FavoriteDish(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_dishes",
    )
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="favorite_dishes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "dish"]]

    def __str__(self):
        return f"{self.user} favorited {self.dish}"


# Add the Chat model with is_archived field
# Note: We won't add the Chat model here since it causes migration issues.
# Instead, we'll add is_archived to the existing ChatMessage model later
  
"""
Модель OrderDraft для автосохранения заказов.
Этот файл будет объединен с models.py.
"""

import uuid

from django.conf import settings
from django.db import models

from .models import Dish, Order


class OrderDraft(models.Model):
    """Черновик заказа для автосохранения данных пользователя."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="order_drafts",
    )
    dish = models.ForeignKey(
        Dish,
        on_delete=models.CASCADE,
        related_name="order_drafts",
    )
    quantity = models.PositiveIntegerField(default=1)
    delivery_type = models.CharField(
        max_length=20,
        choices=Order.DELIVERY_TYPE_CHOICES,
        default="BUILDING",
    )
    delivery_address_text = models.TextField(blank=True, default="")
    apartment = models.CharField(max_length=50, blank=True, default="")
    entrance = models.CharField(max_length=50, blank=True, default="")
    floor = models.CharField(max_length=50, blank=True, default="")
    intercom = models.CharField(max_length=50, blank=True, default="")
    delivery_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    delivery_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True
    )
    delivery_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selected_toppings = models.JSONField(
        default=list, blank=True, help_text="List of {name, price} selected toppings"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
            models.Index(fields=["user", "dish"]),
        ]

    def __str__(self):
        return f"OrderDraft for {self.user} - {self.dish.name}"
