"""
Улучшенная система фильтрации для API.
"""

import django_filters
from django_filters import rest_framework as filters
from .models import Producer, Dish, Order, Category, Review


class ProducerFilter(filters.FilterSet):
    """Фильтры для производителей."""
    city = django_filters.CharFilter(lookup_expr='icontains')
    name = django_filters.CharFilter(lookup_expr='icontains')
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')
    producer_type = django_filters.ChoiceFilter(choices=Producer.PRODUCER_TYPES)
    is_hidden = django_filters.BooleanFilter()
    
    # Фильтр по диапазону дат регистрации
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = Producer
        fields = {
            'city': ['exact', 'icontains'],
            'name': ['exact', 'icontains'],
            'producer_type': ['exact'],
            'is_hidden': ['exact'],
            'rating': ['exact', 'gte', 'lte'],
        }


class DishFilter(filters.FilterSet):
    """Фильтры для блюд."""
    name = django_filters.CharFilter(lookup_expr='icontains')
    description = django_filters.CharFilter(lookup_expr='icontains')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    category = django_filters.ModelChoiceFilter(queryset=Category.objects.all())
    producer = django_filters.ModelChoiceFilter(queryset=Producer.objects.all())
    is_available = django_filters.BooleanFilter()
    is_top = django_filters.BooleanFilter()
    
    # Фильтр по диапазону дат
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Фильтр по рейтингу
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')
    
    # Фильтр по калорийности
    min_calories = django_filters.NumberFilter(field_name='calories', lookup_expr='gte')
    max_calories = django_filters.NumberFilter(field_name='calories', lookup_expr='lte')
    
    class Meta:
        model = Dish
        fields = {
            'name': ['exact', 'icontains'],
            'description': ['exact', 'icontains'],
            'price': ['exact', 'gte', 'lte'],
            'category': ['exact'],
            'producer': ['exact'],
            'is_available': ['exact'],
            'is_top': ['exact'],
            'rating': ['exact', 'gte', 'lte'],
            'calories': ['exact', 'gte', 'lte'],
        }


class OrderFilter(filters.FilterSet):
    """Фильтры для заказов."""
    status = django_filters.ChoiceFilter(choices=Order.STATUS_CHOICES)
    user = django_filters.NumberFilter(field_name='user_id')
    producer = django_filters.NumberFilter(field_name='producer_id')
    dish = django_filters.NumberFilter(field_name='dish_id')
    is_gift = django_filters.BooleanFilter()
    is_urgent = django_filters.BooleanFilter()
    
    # Фильтр по диапазону дат
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Фильтр по диапазону цен
    min_total_price = django_filters.NumberFilter(field_name='total_price', lookup_expr='gte')
    max_total_price = django_filters.NumberFilter(field_name='total_price', lookup_expr='lte')
    
    # Фильтр по времени готовки
    min_cooking_time = django_filters.NumberFilter(field_name='estimated_cooking_time', lookup_expr='gte')
    max_cooking_time = django_filters.NumberFilter(field_name='estimated_cooking_time', lookup_expr='lte')
    
    class Meta:
        model = Order
        fields = {
            'status': ['exact'],
            'user_id': ['exact'],
            'producer_id': ['exact'],
            'dish_id': ['exact'],
            'is_gift': ['exact'],
            'is_urgent': ['exact'],
            'total_price': ['exact', 'gte', 'lte'],
            'estimated_cooking_time': ['exact', 'gte', 'lte'],
        }


class ReviewFilter(filters.FilterSet):
    """Фильтры для отзывов."""
    user = django_filters.NumberFilter(field_name='user_id')
    producer = django_filters.NumberFilter(field_name='producer_id')
    order = django_filters.NumberFilter(field_name='order_id')
    
    # Фильтр по рейтингу
    min_rating_taste = django_filters.NumberFilter(field_name='rating_taste', lookup_expr='gte')
    max_rating_taste = django_filters.NumberFilter(field_name='rating_taste', lookup_expr='lte')
    min_rating_appearance = django_filters.NumberFilter(field_name='rating_appearance', lookup_expr='gte')
    max_rating_appearance = django_filters.NumberFilter(field_name='rating_appearance', lookup_expr='lte')
    min_rating_service = django_filters.NumberFilter(field_name='rating_service', lookup_expr='gte')
    max_rating_service = django_filters.NumberFilter(field_name='rating_service', lookup_expr='lte')
    
    # Фильтр по диапазону дат
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = Review
        fields = {
            'user_id': ['exact'],
            'producer_id': ['exact'],
            'order_id': ['exact'],
            'rating_taste': ['exact', 'gte', 'lte'],
            'rating_appearance': ['exact', 'gte', 'lte'],
            'rating_service': ['exact', 'gte', 'lte'],
        }


class CategoryFilter(filters.FilterSet):
    """Фильтры для категорий."""
    name = django_filters.CharFilter(lookup_expr='icontains')
    parent = django_filters.NumberFilter(field_name='parent_id')
    
    class Meta:
        model = Category
        fields = {
            'name': ['exact', 'icontains'],
            'parent_id': ['exact'],
        }


# Комбинированные фильтры для комплексных запросов
class ProducerDishFilter(filters.FilterSet):
    """Фильтры для блюд с информацией о производителе."""
    producer_city = django_filters.CharFilter(field_name='producer__city', lookup_expr='icontains')
    producer_name = django_filters.CharFilter(field_name='producer__name', lookup_expr='icontains')
    producer_rating_gte = django_filters.NumberFilter(field_name='producer__rating', lookup_expr='gte')
    producer_rating_lte = django_filters.NumberFilter(field_name='producer__rating', lookup_expr='lte')
    
    dish_name = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    dish_price_gte = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    dish_price_lte = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    dish_is_available = django_filters.BooleanFilter(field_name='is_available')
    dish_is_top = django_filters.BooleanFilter(field_name='is_top')
    
    class Meta:
        model = Dish
        fields = []


class OrderUserProducerFilter(filters.FilterSet):
    """Фильтры для заказов с информацией о пользователе и производителе."""
    user_name = django_filters.CharFilter(field_name='user__username', lookup_expr='icontains')
    user_email = django_filters.CharFilter(field_name='user__email', lookup_expr='icontains')
    producer_name = django_filters.CharFilter(field_name='dish__producer__name', lookup_expr='icontains')
    producer_city = django_filters.CharFilter(field_name='dish__producer__city', lookup_expr='icontains')
    
    class Meta:
        model = Order
        fields = []