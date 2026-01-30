"""Producers API v1 serializers."""
from rest_framework import serializers
from api.models import Producer


class ProducerSerializer(serializers.ModelSerializer):
    """Serializer for Producer model."""

    class Meta:
        model = Producer
        fields = [
            'id',
            'name',
            'description',
            'rating',
            'penalty_points',
            'consecutive_rejections',
            'is_banned',
            'ban_reason',
            'banned_at',
            'balance',
            'last_penalty_payment_date',
        ]
        read_only_fields = [
            'id',
            'rating',
            'penalty_points',
            'consecutive_rejections',
            'is_banned',
            'ban_reason',
            'banned_at',
            'last_penalty_payment_date',
        ]
