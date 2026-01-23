"""
Сериализаторы для новых моделей улучшений со средним приоритетом.
"""

from rest_framework import serializers
from django.db import models
from .models_new import (
    SavedCartItem,
    MessageTemplate,
    CommunicationRating,
    SubscriptionOrder,
    ReferralBonus,
    LimitedOffer,
    Recommendation,
    UserPreference,
    PersonalizedOffer,
)
from .models import Dish, Producer, Order, Category


class SavedCartItemSerializer(serializers.ModelSerializer):
    """Сериализатор для сохраненных товаров пользователя."""
    dish_name = serializers.CharField(source='dish.name', read_only=True)
    dish_photo = serializers.CharField(source='dish.photo', read_only=True)
    dish_price = serializers.DecimalField(source='dish.price', read_only=True, max_digits=10, decimal_places=2)

    class Meta:
        model = SavedCartItem
        fields = [
            'id',
            'user',
            'dish',
            'dish_name',
            'dish_photo',
            'dish_price',
            'quantity',
            'selected_toppings',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MessageTemplateSerializer(serializers.ModelSerializer):
    """Сериализатор для шаблонов сообщений."""
    producer_name = serializers.CharField(source='producer.name', read_only=True)

    class Meta:
        model = MessageTemplate
        fields = [
            'id',
            'producer',
            'producer_name',
            'title',
            'content',
            'is_active',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CommunicationRatingSerializer(serializers.ModelSerializer):
    """Сериализатор для оценки качества общения."""
    rater_email = serializers.EmailField(source='rater.email', read_only=True)
    rated_user_email = serializers.EmailField(source='rated_user.email', read_only=True)
    order_id = serializers.UUIDField(source='order.id', read_only=True)

    class Meta:
        model = CommunicationRating
        fields = [
            'id',
            'order',
            'order_id',
            'rater',
            'rater_email',
            'rated_user',
            'rated_user_email',
            'rating',
            'comment',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SubscriptionOrderSerializer(serializers.ModelSerializer):
    """Сериализатор для подписок на регулярные заказы."""
    dish_name = serializers.CharField(source='dish.name', read_only=True)
    dish_photo = serializers.CharField(source='dish.photo', read_only=True)
    dish_price = serializers.DecimalField(source='dish.price', read_only=True, max_digits=10, decimal_places=2)

    class Meta:
        model = SubscriptionOrder
        fields = [
            'id',
            'user',
            'dish',
            'dish_name',
            'dish_photo',
            'dish_price',
            'quantity',
            'selected_toppings',
            'frequency',
            'status',
            'start_date',
            'next_delivery_date',
            'end_date',
            'delivery_address_text',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReferralBonusSerializer(serializers.ModelSerializer):
    """Сериализатор для реферальных бонусов."""
    referrer_email = serializers.EmailField(source='referrer.email', read_only=True)
    referee_email = serializers.EmailField(source='referee.email', read_only=True, allow_null=True)

    class Meta:
        model = ReferralBonus
        fields = [
            'id',
            'referrer',
            'referrer_email',
            'referee',
            'referee_email',
            'referral_code',
            'status',
            'bonus_amount',
            'minimum_order_amount',
            'expires_at',
            'paid_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LimitedOfferSerializer(serializers.ModelSerializer):
    """Сериализатор для лимитированных предложений."""
    producer_name = serializers.CharField(source='producer.name', read_only=True)
    dishes_list = serializers.SerializerMethodField()

    class Meta:
        model = LimitedOffer
        fields = [
            'id',
            'producer',
            'producer_name',
            'title',
            'description',
            'dishes',
            'dishes_list',
            'discount_percentage',
            'max_quantity',
            'current_quantity',
            'status',
            'start_at',
            'end_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_dishes_list(self, obj):
        return [
            {
                'id': dish.id,
                'name': dish.name,
                'photo': dish.photo,
                'price': dish.price,
            }
            for dish in obj.dishes.all()
        ]


class RecommendationSerializer(serializers.ModelSerializer):
    """Сериализатор для рекомендаций."""
    dish_name = serializers.CharField(source='dish.name', read_only=True)
    dish_photo = serializers.CharField(source='dish.photo', read_only=True)
    dish_price = serializers.DecimalField(source='dish.price', read_only=True, max_digits=10, decimal_places=2)
    producer_name = serializers.CharField(source='dish.producer.name', read_only=True)

    class Meta:
        model = Recommendation
        fields = [
            'id',
            'user',
            'dish',
            'dish_name',
            'dish_photo',
            'dish_price',
            'producer_name',
            'recommendation_type',
            'score',
            'reason',
            'is_shown',
            'is_clicked',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UserPreferenceSerializer(serializers.ModelSerializer):
    """Сериализатор для предпочтений пользователя."""
    favorite_categories_list = serializers.SerializerMethodField()
    disliked_categories_list = serializers.SerializerMethodField()
    favorite_producers_list = serializers.SerializerMethodField()

    class Meta:
        model = UserPreference
        fields = [
            'id',
            'user',
            'favorite_categories',
            'favorite_categories_list',
            'disliked_categories',
            'disliked_categories_list',
            'favorite_producers',
            'favorite_producers_list',
            'dietary_restrictions',
            'price_range_min',
            'price_range_max',
            'spicy_preference',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_favorite_categories_list(self, obj):
        return [
            {
                'id': cat.id,
                'name': cat.name,
            }
            for cat in obj.favorite_categories.all()
        ]

    def get_disliked_categories_list(self, obj):
        return [
            {
                'id': cat.id,
                'name': cat.name,
            }
            for cat in obj.disliked_categories.all()
        ]

    def get_favorite_producers_list(self, obj):
        return [
            {
                'id': prod.id,
                'name': prod.name,
                'logo_url': prod.logo_url,
            }
            for prod in obj.favorite_producers.all()
        ]


class PersonalizedOfferSerializer(serializers.ModelSerializer):
    """Сериализатор для индивидуальных скидок и предложений."""
    dishes_list = serializers.SerializerMethodField()

    class Meta:
        model = PersonalizedOffer
        fields = [
            'id',
            'user',
            'title',
            'description',
            'offer_type',
            'discount_percentage',
            'discount_amount',
            'dishes',
            'dishes_list',
            'min_order_amount',
            'status',
            'valid_from',
            'valid_until',
            'sent_at',
            'viewed_at',
            'used_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_dishes_list(self, obj):
        return [
            {
                'id': dish.id,
                'name': dish.name,
                'photo': dish.photo,
                'price': dish.price,
            }
            for dish in obj.dishes.all()
        ]


class DetailedReviewSerializer(serializers.ModelSerializer):
    """Сериализатор для детализированных отзывов."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    dish_name = serializers.CharField(source='order.dish.name', read_only=True)
    dish_photo = serializers.CharField(source='order.dish.photo', read_only=True)
    producer_name = serializers.CharField(source='producer.name', read_only=True)
    overall_rating = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationRating
        fields = [
            'id',
            'order',
            'user',
            'user_email',
            'producer',
            'producer_name',
            'dish_name',
            'dish_photo',
            'rating_taste',
            'rating_appearance',
            'rating_service',
            'rating_portion',
            'rating_packaging',
            'overall_rating',
            'comment',
            'photo',
            'video',
            'seller_response',
            'seller_response_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_overall_rating(self, obj):
        """Вычислить среднюю оценку."""
        ratings = [
            obj.rating_taste,
            obj.rating_appearance,
            obj.rating_service,
            getattr(obj, 'rating_portion', 5),
            getattr(obj, 'rating_packaging', 5),
        ]
        return sum(ratings) / len(ratings)
