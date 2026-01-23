"""
Разделенные модели для заказа.
Этот файл содержит новые модели, которые заменят собой поля большой модели Order.
"""

from django.db import models
import uuid
from django.conf import settings
import django.utils.timezone
from decimal import Decimal
from .models import Order, Producer, Dish, PromoCode, Payment


class OrderDelivery(models.Model):
    """Модель, содержащая информацию о доставке заказа."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery_info')
    
    # Delivery Info
    delivery_type = models.CharField(max_length=20, choices=Order.DELIVERY_TYPE_CHOICES, default='BUILDING')
    delivery_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_address_text = models.TextField(blank=True, default="")
    apartment = models.CharField(max_length=50, blank=True, default="")
    entrance = models.CharField(max_length=50, blank=True, default="")
    floor = models.CharField(max_length=50, blank=True, default="")
    intercom = models.CharField(max_length=50, blank=True, default="")
    delivery_comment = models.TextField(blank=True, default="")
    
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
    # Gift delivery info
    recipient_address_text = models.TextField(blank=True)
    recipient_latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    recipient_longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    recipient_specified_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'order_delivery'
        verbose_name = 'Order Delivery'
        verbose_name_plural = 'Order Deliveries'


class OrderFinance(models.Model):
    """Модель, содержащая финансовую информацию о заказе."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='finance_info')
    
    # Financial snapshots
    tips_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_rate_snapshot = models.DecimalField(max_digits=5, decimal_places=4, default=0.0) # stored as 0.05 for 5%
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    producer_gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    producer_net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_tips_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payable_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout_status = models.CharField(
        max_length=20,
        choices=[
            ('NOT_ACCRUED', 'Not Accrued'),
            ('ACCRUED', 'Accrued'),
            ('PAID_OUT', 'Paid Out'),
        ],
        default='NOT_ACCRUED',
    )
    payout_accrued_at = models.DateTimeField(null=True, blank=True)
    payout_paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'order_finance'
        verbose_name = 'Order Finance'
        verbose_name_plural = 'Order Finances'


class OrderGift(models.Model):
    """Модель, содержащая информацию о подарке."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='gift_info')
    
    # Anonymous Gift logic
    is_gift = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    recipient_phone = models.CharField(max_length=50, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    gift_proof_image = models.URLField(blank=True, null=True)
    recipient_token = models.CharField(max_length=64, unique=True, blank=True, null=True)
    recipient_token_expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'order_gift'
        verbose_name = 'Order Gift'
        verbose_name_plural = 'Order Gifts'


class OrderReschedule(models.Model):
    """Модель, содержащая информацию о переносе заказа."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='reschedule_info')
    
    # Rescheduling logic
    reschedule_requested_by_seller = models.BooleanField(default=False)
    reschedule_new_time = models.DateTimeField(null=True, blank=True)
    reschedule_approved_by_buyer = models.BooleanField(null=True, blank=True) # None=Pending, True=Yes, False=No
    
    class Meta:
        db_table = 'order_reschedule'
        verbose_name = 'Order Reschedule'
        verbose_name_plural = 'Order Reschedules'


class OrderPromo(models.Model):
    """Модель, содержащая информацию о промо-акциях для заказа."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='promo_info')
    
    # Promo
    applied_promo_code = models.ForeignKey(PromoCode, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'order_promo'
        verbose_name = 'Order Promo'
        verbose_name_plural = 'Order Promos'


class OrderTimeline(models.Model):
    """Модель, содержащая информацию о временных метках заказа."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='timeline_info')
    
    created_at = models.DateTimeField(auto_now_add=True)
    acceptance_deadline = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=20, choices=Order.CANCELLED_BY_CHOICES, null=True, blank=True)
    cancelled_reason = models.TextField(blank=True)
    estimated_cooking_time = models.PositiveIntegerField(default=0, help_text="Total minutes")
    finished_photo = models.URLField(blank=True, null=True)
    
    class Meta:
        db_table = 'order_timeline'
        verbose_name = 'Order Timeline'
        verbose_name_plural = 'Order Timelines'


class OrderToppings(models.Model):
    """Модель, содержащая информацию о топпингах заказа."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='toppings_info')
    
    selected_toppings = models.JSONField(default=list, blank=True, help_text="List of {name, price} selected toppings")
    
    class Meta:
        db_table = 'order_toppings'
        verbose_name = 'Order Toppings'
        verbose_name_plural = 'Order Toppings'