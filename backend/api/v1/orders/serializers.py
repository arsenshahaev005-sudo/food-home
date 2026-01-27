"""Orders API v1 serializers."""

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import serializers

from api.models import Order


class OrderAcceptSerializer(serializers.Serializer):
    """Сериализатор для принятия заказа продавцом."""

    order_id = serializers.UUIDField()

    def validate(self, data):
        order_id = data.get("order_id")

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise ValidationError("Заказ не найден")

        if order.status != "WAITING_FOR_ACCEPTANCE":
            raise ValidationError("Можно принять только ожидающие заказы")

        if order.acceptance_deadline and timezone.now() > order.acceptance_deadline:
            raise ValidationError("Время на принятие заказа истекло")

        data["order"] = order
        return data


class OrderRejectSerializer(serializers.Serializer):
    """Сериализатор для отклонения заказа продавцом."""

    order_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class OrderCancelSerializer(serializers.Serializer):
    """Сериализатор для отмены заказа покупателем или продавцом."""

    order_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class OrderListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка заказов."""

    dish_name = serializers.CharField(source="dish.name", read_only=True)
    producer_name = serializers.CharField(source="producer.name", read_only=True)
    producer_id = serializers.UUIDField(source="producer.id", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "dish_name",
            "producer_name",
            "producer_id",
            "quantity",
            "total_price",
            "status",
            "created_at",
            "estimated_cooking_time",
            "delivery_type",
            "delivery_price",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детальной информации о заказе."""

    dish_name = serializers.CharField(source="dish.name", read_only=True)
    dish_photo = serializers.CharField(source="dish.photo", read_only=True)
    dish_cooking_time = serializers.IntegerField(source="dish.cooking_time_minutes", read_only=True)
    producer_name = serializers.CharField(source="producer.name", read_only=True)
    producer_id = serializers.UUIDField(source="producer.id", read_only=True)
    producer_city = serializers.CharField(source="producer.city", read_only=True)
    producer_address = serializers.CharField(source="producer.address", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user_name",
            "phone",
            "dish_name",
            "dish_photo",
            "dish_cooking_time",
            "producer_name",
            "producer_id",
            "producer_city",
            "producer_address",
            "quantity",
            "total_price",
            "status",
            "is_urgent",
            "delivery_type",
            "delivery_price",
            "delivery_address_text",
            "apartment",
            "entrance",
            "floor",
            "intercom",
            "delivery_comment",
            "applied_promo_code",
            "discount_amount",
            "created_at",
            "acceptance_deadline",
            "accepted_at",
            "ready_at",
            "delivered_at",
            "cancelled_at",
            "cancelled_by",
            "cancelled_reason",
            "cancellation_penalty_applied",
            "refund_amount",
            "estimated_cooking_time",
            "finished_photo",
            "selected_toppings",
            "tips_amount",
            "tips_tax_exempt",
            "commission_rate_snapshot",
            "commission_amount",
            "penalty_amount",
            "penalty_reason",
            "producer_gross_amount",
            "producer_net_amount",
            "refunded_total_amount",
            "refunded_tips_amount",
            "refunded_commission_amount",
            "payable_amount",
            "payout_status",
            "payout_accrued_at",
            "payout_paid_at",
            "delivery_latitude",
            "delivery_longitude",
            "delivery_expected_at",
            "delivery_actual_arrival_at",
            "delivery_late_minutes",
            "delivery_penalty_applied",
            "reschedule_requested_by_seller",
            "reschedule_new_time",
            "reschedule_approved_by_buyer",
            "is_gift",
            "is_anonymous",
            "recipient_phone",
            "recipient_name",
            "recipient_address_text",
            "recipient_latitude",
            "recipient_longitude",
            "recipient_specified_time",
            "gift_proof_image",
            "tinkoff_payment_id",
        ]
