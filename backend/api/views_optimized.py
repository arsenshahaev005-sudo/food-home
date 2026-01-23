"""
Оптимизированные представления с улучшенной обработкой запросов и безопасностью.
"""

from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter
from rest_framework.throttling import SimpleRateThrottle
import math
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError
from django.utils.crypto import get_random_string
import random
import requests
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import re
from django.conf import settings
from rest_framework.decorators import action
from datetime import timedelta, datetime
from django.utils import timezone
from django.db import models
from django.db.models import Q, Sum, Count, Avg
from django.db.models.functions import TruncDate
from decimal import Decimal

from .models import (
    Producer,
    Dish,
    Category,
    Order,
    OrderDelivery,
    OrderFinance,
    OrderGift,
    OrderReschedule,
    OrderPromo,
    OrderTimeline,
    OrderToppings,
    Cart,
    CartItem,
    DishImage,
    Dispute,
    Payout,
    ChatMessage,
    ChatComplaint,
    PromoCode,
    Review,
    Payment,
    UserDevice,
    Notification,
    HelpArticle,
    DishTopping,
    GiftOrder,
    GiftProduct,
)
from .serializers_optimized import (
    ProducerSerializer,
    DishSerializer,
    CategorySerializer,
    OrderSerializer,
    UserDeviceSerializer,
    NotificationSerializer,
    HelpArticleSerializer,
    ReviewSerializer,
    PromoCodeSerializer,
    ChatMessageSerializer,
    ChatComplaintSerializer,
    PaymentMethodSerializer,
    CartSerializer,
    CartItemSerializer,
    ProducerDetailSerializer,
    DishListSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
)
from core.responses import APIResponse
from core.exceptions import (
    ValidationException,
    BusinessRuleException,
    NotFoundException,
    PermissionException,
    ConflictException
)
from core.permissions import OrderPermissions, ProducerPermissions
from api.services.order_status import (
    OrderStatusService,
    OrderActor,
    InvalidOrderTransition,
    PermissionDeniedForTransition,
)
from api.services.payment_service import PaymentService
from api.services.gift_service import (
    GiftService,
    GiftActivationContext,
    PublicGiftService,
    GiftCreateDTO,
    GiftAnalyticsService,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class ProducerViewSet(viewsets.ModelViewSet):
    """ViewSet для управления производителями."""
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer
    permission_classes = [IsAuthenticated, ProducerPermissions]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['city', 'producer_type', 'is_hidden']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        """
        Оптимизированный queryset с предзагрузкой связанных данных.
        """
        queryset = Producer.objects.prefetch_related(
            'dishes',  # Предзагружаем блюда
            'main_category',  # Предзагружаем главную категорию
        ).select_related(
            'user'  # Предзагружаем связанного пользователя
        )
        
        # Фильтрация по скрытым/не скрытым (по умолчанию показываем только активные)
        if not self.request.query_params.get('show_hidden'):
            queryset = queryset.filter(is_hidden=False)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Список производителей с пагинацией и фильтрацией."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(data=serializer.data)
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении списка производителей",
                error_code="PRODUCER_LIST_ERROR",
                details={"error": str(e)}
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Детали производителя."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(data=serializer.data)
        except Producer.DoesNotExist:
            return APIResponse.not_found("Producer", str(kwargs['pk']))
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении деталей производителя",
                error_code="PRODUCER_RETRIEVE_ERROR",
                details={"error": str(e)}
            )


class DishViewSet(viewsets.ModelViewSet):
    """ViewSet для управления блюдами."""
    queryset = Dish.objects.all()
    serializer_class = DishSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['category', 'producer', 'is_available', 'is_top']
    search_fields = ['name', 'description', 'composition']
    
    def get_queryset(self):
        """
        Оптимизированный queryset с предзагрузкой связанных данных.
        """
        queryset = Dish.objects.select_related(
            'producer',  # Предзагружаем производителя
            'category',  # Предзагружаем категорию
        ).prefetch_related(
            'images',  # Предзагружаем изображения
            'toppings',  # Предзагружаем топпинги
        )
        
        # Фильтрация по доступности (по умолчанию только доступные)
        if not self.request.query_params.get('show_unavailable'):
            queryset = queryset.filter(is_available=True)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Список блюд с пагинацией и фильтрацией."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(data=serializer.data)
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении списка блюд",
                error_code="DISH_LIST_ERROR",
                details={"error": str(e)}
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Детали блюда."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(data=serializer.data)
        except Dish.DoesNotExist:
            return APIResponse.not_found("Dish", str(kwargs['pk']))
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении деталей блюда",
                error_code="DISH_RETRIEVE_ERROR",
                details={"error": str(e)}
            )


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet для управления заказами."""
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, OrderPermissions]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'producer', 'user', 'is_gift']
    search_fields = ['user_name', 'phone']
    
    def get_queryset(self):
        """
        Оптимизированный queryset с предзагрузкой связанных данных.
        """
        queryset = Order.objects.select_related(
            'user',
            'dish__producer',
            'producer',
            'applied_promo_code',
            'current_payment',
        ).prefetch_related(
            'disputes',
            # Предзагружаем связанные модели заказа
            'delivery_info',
            'finance_info',
            'gift_info',
            'reschedule_info',
            'promo_info',
            'timeline_info',
            'toppings_info',
            'dish__images',
            'dish__toppings',
        )
        
        # Если пользователь - не админ, то показываем только его заказы
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(user=self.request.user) | Q(dish__producer__user=self.request.user)
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Список заказов с пагинацией и фильтрацией."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(data=serializer.data)
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении списка заказов",
                error_code="ORDER_LIST_ERROR",
                details={"error": str(e)}
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Детали заказа."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(data=serializer.data)
        except Order.DoesNotExist:
            return APIResponse.not_found("Order", str(kwargs['pk']))
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении деталей заказа",
                error_code="ORDER_RETRIEVE_ERROR",
                details={"error": str(e)}
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, *args, **kwargs):
        """Отменить заказ."""
        try:
            order = self.get_object()
            order_status_service = OrderStatusService()
            
            actor = OrderActor(user=request.user, role="BUYER" if request.user == order.user else "SELLER")
            updated_order = order_status_service.cancel_order(
                order_id=order.id,
                actor=actor,
                reason=request.data.get('reason', '')
            )
            
            serializer = self.get_serializer(updated_order)
            return APIResponse.success(
                data=serializer.data,
                message="Заказ успешно отменен"
            )
        except PermissionDeniedForTransition:
            return APIResponse.error(
                message="У вас нет прав для отмены этого заказа",
                error_code="ORDER_CANCEL_PERMISSION_DENIED"
            )
        except InvalidOrderTransition:
            return APIResponse.error(
                message="Невозможно отменить заказ в текущем статусе",
                error_code="ORDER_CANCEL_INVALID_STATUS"
            )
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при отмене заказа",
                error_code="ORDER_CANCEL_ERROR",
                details={"error": str(e)}
            )
    
    @action(detail=True, methods=['post'])
    def pay(self, request, *args, **kwargs):
        """Инициировать оплату заказа."""
        try:
            order = self.get_object()
            payment_service = PaymentService()
            
            # Получаем URL возврата из запроса
            return_url = request.data.get('return_url')
            if not return_url:
                return APIResponse.error(
                    message="URL возврата обязателен",
                    error_code="PAYMENT_RETURN_URL_REQUIRED"
                )
            
            payment, payment_url = payment_service.init_payment(order, return_url)
            
            return APIResponse.success(
                data={
                    'payment_url': payment_url,
                    'payment_id': str(payment.id)
                },
                message="Оплата инициирована"
            )
        except ValueError as e:
            return APIResponse.error(
                message=str(e),
                error_code="PAYMENT_INIT_ERROR"
            )
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при инициации оплаты",
                error_code="PAYMENT_ERROR",
                details={"error": str(e)}
            )


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для категорий (только чтение)."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ['name']
    
    def get_queryset(self):
        """
        Оптимизированный queryset с предзагрузкой связанных данных.
        """
        queryset = Category.objects.prefetch_related(
            'subcategories',  # Предзагружаем подкатегории
            'dishes',  # Предзагружаем блюда в категории
        ).annotate(
            dishes_count=Count('dishes')  # Подсчитываем количество блюд
        )
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Список категорий."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(data=serializer.data)
        except Exception as e:
            return APIResponse.error(
                message="Ошибка при получении списка категорий",
                error_code="CATEGORY_LIST_ERROR",
                details={"error": str(e)}
            )


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet для отзывов."""
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'producer', 'user']
    
    def get_queryset(self):
        """
        Оптимизированный queryset с предзагрузкой связанных данных.
        """
        queryset = Review.objects.select_related(
            'order__dish__producer',
            'user',
            'producer',
        ).prefetch_related(
            'order__dish__images',
            'order__delivery_info',
            'order__finance_info',
        )
        return queryset
    
    def perform_create(self, serializer):
        """Проверяем права перед созданием отзыва."""
        order = serializer.validated_data.get('order')
        if order and order.user != self.request.user:
            raise PermissionException("Вы можете оставить отзыв только для своего заказа")
        serializer.save(user=self.request.user)