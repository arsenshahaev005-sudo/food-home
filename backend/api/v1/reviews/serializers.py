"""Reviews API v1 serializers."""
from decimal import Decimal
from rest_framework import serializers

from api.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """Сериализатор для отзыва."""

    class Meta:
        model = Review
        fields = [
            "id",
            "order",
            "user",
            "producer",
            "rating_taste",
            "rating_appearance",
            "rating_service",
            "comment",
            "photo",
            "video",
            "rating_portion",
            "rating_packaging",
            "seller_response",
            "seller_response_at",
            "is_updated",
            "refund_offered_amount",
            "refund_accepted",
            "original_rating_taste",
            "original_rating_appearance",
            "original_rating_service",
            "correction_requested_at",
            "correction_approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "producer",
            "seller_response",
            "seller_response_at",
            "is_updated",
            "refund_offered_amount",
            "refund_accepted",
            "original_rating_taste",
            "original_rating_appearance",
            "original_rating_service",
            "correction_requested_at",
            "correction_approved_at",
            "created_at",
            "updated_at",
        ]


class ReviewCorrectionRequestSerializer(serializers.Serializer):
    """Сериализатор для запроса на исправление оценки."""

    refund_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        min_value=Decimal("0.01"),
        help_text="Сумма возврата за исправление оценки"
    )


class ReviewCorrectionAcceptSerializer(serializers.Serializer):
    """Сериализатор для принятия исправления оценки."""

    rating_taste = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=5,
        help_text="Новая оценка вкуса (1-5)"
    )
    rating_appearance = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=5,
        help_text="Новая оценка внешнего вида (1-5)"
    )
    rating_service = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=5,
        help_text="Новая оценка сервиса (1-5)"
    )
