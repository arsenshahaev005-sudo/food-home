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
from django.contrib.auth import get_user_model
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
from datetime import timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
from django.db import models
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncDate
from decimal import Decimal
from .models import (
    Producer,
    Dish,
    Category,
    Order,
    Cart,
    CartItem,
    VerificationCode,
    Profile,
    PendingRegistration,
    Dispute,
    Payout,
    ChatMessage,
    ChatComplaint,
    PromoCode,
    Review,
    PaymentMethod,
    UserDevice,
    Notification,
    HelpArticle,
    PendingChange,
    Payment,
    FavoriteDish,
    OrderDraft,
)
from rest_framework import serializers
from .serializers import (
    ProducerSerializer,
    DishSerializer,
    CategorySerializer,
    OrderSerializer,
    UserSerializer,
    RegistrationSerializer,
    AddressSerializer,
    CartSerializer,
    ChatMessageSerializer,
    ChatComplaintSerializer,
    PromoCodeSerializer,
    ReviewSerializer,
    ProfileSerializer,
    PaymentMethodSerializer,
    UserDeviceSerializer,
    NotificationSerializer,
    HelpArticleSerializer,
    ChangeRequestSerializer,
    ChangeConfirmSerializer,
    FavoriteDishSerializer,
    SearchHistorySerializer,
    SavedSearchSerializer,
    OrderDraftSerializer,
    ReorderSerializer,
)

from rest_framework.filters import OrderingFilter
from api.services.rating_service import RatingService
from api.services.order_status import (
    OrderStatusService,
    OrderActor,
    InvalidOrderTransition,
    PermissionDeniedForTransition,
)
from api.services.payment_service import PaymentService
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


class ShopDescriptionAIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        producer = getattr(request.user, "producer", None)
        if not producer:
            return Response(
                {"detail": "Только для продавца"}, status=status.HTTP_403_FORBIDDEN
            )

        mode = (request.data.get("mode") or "REWRITE").upper()
        target = (request.data.get("target") or "FULL").upper()
        input_text = (request.data.get("text") or "").strip()

        model = os.getenv("OLLAMA_TEXT_MODEL", "qwen2.5")
        max_len = 220 if target == "SHORT" else 900

        if mode not in ("REWRITE", "GENERATE"):
            return Response(
                {"detail": "Некорректный mode"}, status=status.HTTP_400_BAD_REQUEST
            )
        if target not in ("SHORT", "FULL"):
            return Response(
                {"detail": "Некорректный target"}, status=status.HTTP_400_BAD_REQUEST
            )
        if mode == "REWRITE" and not input_text:
            return Response(
                {"detail": "Нужен text для REWRITE"}, status=status.HTTP_400_BAD_REQUEST
            )

        category_name = producer.main_category.name if producer.main_category else ""
        city = producer.city or ""
        shop_name = producer.name or ""

        if mode == "GENERATE":
            seed = f'Название: {shop_name}\nГород: {city}\nКатегория: {category_name}\nКороткое описание: {producer.short_description or ""}'
        else:
            seed = input_text

        system = (
            "Ты пишешь текст для карточки магазина на маркетплейсе еды. "
            "Запрещено: контакты, телефоны, соцсети, email, ссылки, призывы написать в мессенджер. "
            "Без эмодзи. Пиши по-русски. "
            f"Длина до {max_len} символов. "
            "Выведи только готовый текст без кавычек и без заголовков."
        )

        fallback = seed
        if mode == "GENERATE":
            if target == "SHORT":
                fallback = sanitize_shop_text(
                    f"{shop_name}. {category_name}. Домашняя еда и свежие блюда.",
                    max_len,
                )
            else:
                parts = [shop_name]
                if category_name:
                    parts.append(f"Специализация: {category_name}.")
                if city:
                    parts.append(f"Город: {city}.")
                if producer.short_description:
                    parts.append(producer.short_description)
                fallback = sanitize_shop_text(" ".join(parts), max_len)

        try:
            result = ollama_chat_once(
                model=model, system=system, user=seed, timeout_s=20
            )
        except Exception:
            result = fallback

        result = sanitize_shop_text(result, max_len)
        if not result:
            result = sanitize_shop_text(fallback, max_len)

        return Response({"text": result, "target": target, "mode": mode})


class ProducerLogoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        producer = getattr(request.user, "producer", None)
        if not producer:
            return Response(
                {"detail": "Только для продавца"}, status=status.HTTP_403_FORBIDDEN
            )

        f = request.FILES.get("file") or request.FILES.get("logo")
        if not f:
            return Response(
                {"detail": "Файл не найден"}, status=status.HTTP_400_BAD_REQUEST
            )

        name = str(getattr(f, "name", "") or "")
        _, ext = os.path.splitext(name)
        ext = (ext or "").lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            return Response(
                {"detail": "Неподдерживаемый формат"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        size = int(getattr(f, "size", 0) or 0)
        if size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Слишком большой файл (макс 5MB)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.core.files.storage import default_storage

        rel_path = f"producer_logos/{producer.id}/{uuid.uuid4().hex}{ext}"
        saved = default_storage.save(rel_path, f)
        url = default_storage.url(saved)
        abs_url = request.build_absolute_uri(url) if str(url).startswith("/") else url

        producer.logo_url = abs_url
        producer.save(update_fields=["logo_url"])

        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)


class ProducerDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        producer = getattr(request.user, "producer", None)
        if not producer:
            return Response(
                {"detail": "Только для продавца"}, status=status.HTTP_403_FORBIDDEN
            )

        f = request.FILES.get("file")
        doc_type = request.data.get("type", "other")
        doc_name = request.data.get("name", (f.name if f else "Документ"))

        if not f:
            return Response(
                {"detail": "Файл не найден"}, status=status.HTTP_400_BAD_REQUEST
            )

        name = str(getattr(f, "name", "") or "")
        _, ext = os.path.splitext(name)
        ext = (ext or "").lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"):
            return Response(
                {
                    "detail": "Неподдерживаемый формат. Разрешены: JPG, PNG, WEBP, PDF, DOC, DOCX"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        size = int(getattr(f, "size", 0) or 0)
        if size > 10 * 1024 * 1024:
            return Response(
                {"detail": "Слишком большой файл (макс 10MB)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.core.files.storage import default_storage

        rel_path = f"producer_documents/{producer.id}/{uuid.uuid4().hex}{ext}"
        saved = default_storage.save(rel_path, f)
        url = default_storage.url(saved)
        abs_url = request.build_absolute_uri(url) if str(url).startswith("/") else url

        # Update documents list
        docs = producer.documents or []
        new_doc = {
            "id": uuid.uuid4().hex,
            "name": doc_name,
            "type": doc_type,
            "url": abs_url,
            "status": "PENDING",
            "uploaded_at": timezone.now().isoformat(),
            "comment": "",
        }
        docs.append(new_doc)
        producer.documents = docs
        producer.save(update_fields=["documents"])

        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)


class ProducerViewSet(viewsets.ModelViewSet):
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "city"]

    def get_permissions(self):
        """
        Разрешаем публичный доступ для чтения (list, retrieve),
        но требуем аутентификацию для записи (create, update, delete).
        """
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        import logging
        import time
        from django.db import connection
        
        logger = logging.getLogger(__name__)
        start_time = time.time()
        query_count_before = len(connection.queries)
        
        queryset = super().get_queryset()
        action = getattr(self, "action", None)
        if action == "retrieve":
            queryset = queryset.filter(is_banned=False)
        else:
            queryset = queryset.filter(is_hidden=False, is_banned=False)

        # Distance calculation (Approximate sort if lat/lon provided)
        # Real distance requires PostGIS or complex annotation, doing simple logic here or ignoring for mock
        # Ideally: user_lat = request.query_params.get('lat') ...

        # Sorting logic as requested:
        # 1. New stores (< 2 weeks) -> Top
        # 2. Score = Sales (High) + Commission (High) - CookingTime (Low)

        # Since we can't easily do complex weighted sort in basic SQLite/Django ORM without huge annotations,
        # we will order by 'extra_commission_rate' (desc) then 'rating' (desc) for now as proxy.
        # "New stores" boost can be done by ordering by created_at desc first?
        # But user said "New stores top for 2 weeks", then by other metrics.

        now = timezone.now()
        two_weeks_ago = now - timedelta(weeks=2)

        # We can annotate 'is_new'
        from django.db.models import (
            Case,
            When,
            Value,
            BooleanField,
            F,
            FloatField,
            ExpressionWrapper,
        )

        queryset = queryset.annotate(
            is_new=Case(
                When(created_at__gte=two_weeks_ago, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            ),
            # Total commission for sorting
            total_comm=ExpressionWrapper(
                F("extra_commission_rate")
                + Case(
                    When(producer_type="INDIVIDUAL_ENTREPRENEUR", then=Value(10.0)),
                    default=Value(5.0),
                    output_field=FloatField(),
                ),
                output_field=FloatField(),
            ),
        ).order_by("-is_new", "-total_comm", "-rating")
        
        # Log query performance
        query_count_after = len(connection.queries)
        elapsed_time = time.time() - start_time
        logger.warning(
            f"[ProducerViewSet] get_queryset executed in {elapsed_time:.3f}s, "
            f"queries: {query_count_after - query_count_before}, "
            f"result count: {queryset.count()}"
        )

        return queryset

    @action(detail=False, methods=["post"])
    def withdraw(self, request):
        """Simulate manual withdrawal trigger or check"""
        # Logic: Find producer, check balance, create Payout
        producer_id = request.data.get("producer_id")
        producer = Producer.objects.get(id=producer_id)

        if producer.balance <= 0:
            return Response({"detail": "No funds"}, status=status.HTTP_400_BAD_REQUEST)

        # Create Payout
        amount = producer.balance
        tax = amount * 0.04  # Example 4% tax for self-employed/IP simplified

        Payout.objects.create(
            producer=producer,
            amount=amount - float(tax),  # Net amount? Or Gross? Usually payout is Net.
            tax_amount=tax,
            status="PENDING",  # Needs Kontur Sign
        )

        producer.balance = 0
        producer.save()

        return Response({"detail": "Payout created, waiting for signature"})


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        import logging
        import time
        from django.db import connection
        
        logger = logging.getLogger(__name__)
        start_time = time.time()
        query_count_before = len(connection.queries)
        
        queryset = super().get_queryset()
        only_roots = self.request.query_params.get("only_roots")
        if only_roots and only_roots.lower() == "true":
            queryset = queryset.filter(parent__isnull=True)
        
        # Optimize queries with prefetch_related for subcategories
        queryset = queryset.prefetch_related('subcategories')
        
        # Log query performance
        query_count_after = len(connection.queries)
        elapsed_time = time.time() - start_time
        logger.warning(
            f"[CategoryViewSet] get_queryset executed in {elapsed_time:.3f}s, "
            f"queries: {query_count_after - query_count_before}, "
            f"result count: {queryset.count()}"
        )
        
        return queryset


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatMessage.objects.filter(
            models.Q(sender=user) | models.Q(recipient=user)
        ).order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.recipient != request.user:
            return Response(
                {"detail": "Not your message"}, status=status.HTTP_403_FORBIDDEN
            )

        message.is_read = True
        message.save()
        return Response({"detail": "Marked as read"})


class ChatComplaintViewSet(viewsets.ModelViewSet):
    queryset = ChatComplaint.objects.all()
    serializer_class = ChatComplaintSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


from rest_framework.filters import SearchFilter, OrderingFilter


class DishViewSet(viewsets.ModelViewSet):
    queryset = Dish.objects.all()
    serializer_class = DishSerializer
    filterset_fields = [
        "name",
        "producer",
        "is_available",
        "is_archived",
        "allow_preorder",
        "cooking_time_minutes",
        "calories",
        "proteins",
        "fats",
        "carbs",
    ]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "category__name", "producer__name"]
    ordering_fields = [
        "price",
        "sales_count",
        "created_at",
        "views_count",
        "producer__rating",
        "rating",
        "rating_count",
        "sort_score",
        "cooking_time_minutes",
        "calories",
        "proteins",
        "fats",
        "carbs",
    ]
    ordering = ["-sort_score", "-sales_count"]

    def get_permissions(self):
        """
        Разрешаем публичный доступ для чтения (list, retrieve),
        но требуем аутентификацию для записи (create, update, delete).
        """
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        import logging
        from django.db import connection
        from django.utils import timezone
        import time
        
        logger = logging.getLogger(__name__)
        start_time = time.time()
        query_count_before = len(connection.queries)
        
        queryset = super().get_queryset()
        if self.request.method in ["PATCH", "PUT", "DELETE", "POST"]:
            return queryset

        category_id = self.request.query_params.get("category")
        if category_id:
            try:
                root_category = Category.objects.get(id=category_id)
                child_ids = list(
                    root_category.subcategories.values_list("id", flat=True)
                )
                category_ids = [root_category.id] + child_ids
                queryset = queryset.filter(category_id__in=category_ids)
            except Category.DoesNotExist:
                queryset = queryset.none()

        is_archived_param = self.request.query_params.get("is_archived")

        if is_archived_param is not None:
            is_archived = is_archived_param.lower() in ["true", "1", "t", "y", "yes"]
            queryset = queryset.filter(is_archived=is_archived)
        else:
            queryset = queryset.filter(is_archived=False)
        
        # Optimize queries with prefetch_related and select_related
        queryset = queryset.select_related('category', 'producer').prefetch_related(
            'images', 'toppings', 'favorite_dishes'
        )
        
        # Log query performance
        query_count_after = len(connection.queries)
        elapsed_time = time.time() - start_time
        logger.warning(
            f"[DishViewSet] get_queryset executed in {elapsed_time:.3f}s, "
            f"queries: {query_count_after - query_count_before}, "
            f"result count: {queryset.count()}"
        )
        
        return queryset

    def retrieve(self, request, *args, **kwargs):
        # Increment view count
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=["views_count"])
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        dish = self.get_object()
        photo = request.FILES.get("photo")
        if not photo:
            return Response(
                {"detail": "Photo file required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Simple upload logic (ideally use S3/Cloudinary)
        # For now, we'll use a local path or a mock URL
        # Let's assume there's a helper or just use the file name
        from django.core.files.storage import default_storage

        path = default_storage.save(f"dishes/{uuid.uuid4().hex}_{photo.name}", photo)
        url = request.build_absolute_uri(settings.MEDIA_URL + path)

        dish.photo = url
        dish.save(update_fields=["photo"])

        serializer = self.get_serializer(dish)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path="remove_image")
    def remove_image(self, request, pk=None):
        dish = self.get_object()
        image_id = request.query_params.get("image_id")
        if not image_id:
            return Response(
                {"detail": "image_id required"}, status=status.HTTP_400_BAD_REQUEST
            )

        from .models import DishImage

        try:
            image = DishImage.objects.get(id=image_id, dish=dish)
            # Delete file if it's local
            if image.image.startswith(request.build_absolute_uri(settings.MEDIA_URL)):
                rel_path = image.image.replace(
                    request.build_absolute_uri(settings.MEDIA_URL), ""
                )
                from django.core.files.storage import default_storage

                if default_storage.exists(rel_path):
                    default_storage.delete(rel_path)

            image.delete()
        except DishImage.DoesNotExist:
            return Response(
                {"detail": "Image not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(dish)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def add_image(self, request, pk=None):
        dish = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response(
                {"detail": "Image file required"}, status=status.HTTP_400_BAD_REQUEST
            )

        from django.core.files.storage import default_storage

        path = default_storage.save(
            f"dishes/extra/{uuid.uuid4().hex}_{image.name}", image
        )
        url = request.build_absolute_uri(settings.MEDIA_URL + path)

        from .models import DishImage

        DishImage.objects.create(dish=dish, image=url)

        serializer = self.get_serializer(dish)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="autocomplete")
    def autocomplete(self, request):
        """Autocomplete endpoint for popular search queries."""
        query = request.query_params.get("q", "").strip()
        limit = int(request.query_params.get("limit", 10))

        if not query:
            # Return popular dishes if no query provided
            popular_dishes = self.get_queryset().order_by("-sales_count")[:limit]
            serializer = self.get_serializer(popular_dishes, many=True)
            return Response(serializer.data)

        # Filter dishes by name that contain the query
        queryset = (
            self.get_queryset()
            .filter(name__icontains=query)
            .order_by("-sales_count")[:limit]
        )
        serializer = self.get_serializer(queryset, many=True)

        # Save search history
        if request.user.is_authenticated:
            from .models import SearchHistory

            results_count = queryset.count()
            SearchHistory.objects.create(
                user=request.user, query=query, results_count=results_count
            )

        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="saved-searches")
    def saved_searches(self, request):
        """Get user's saved searches."""
        if not request.user.is_authenticated:
            return Response([], status=status.HTTP_401_UNAUTHORIZED)

        from .models import SavedSearch

        saved_searches = SavedSearch.objects.filter(user=request.user).order_by(
            "-created_at"
        )
        return Response(
            [
                {
                    "id": str(search.id),
                    "name": search.name,
                    "query_params": search.query_params,
                    "created_at": search.created_at,
                }
                for search in saved_searches
            ]
        )

    @action(detail=False, methods=["post"], url_path="save-search")
    def save_search(self, request):
        """Save current search parameters."""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        name = request.data.get("name")
        query_params = request.GET.dict()  # Get current query parameters

        if not name:
            return Response(
                {"error": "Name is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        from .models import SavedSearch

        saved_search = SavedSearch.objects.create(
            user=request.user, name=name, query_params=query_params
        )

        return Response(
            {
                "id": str(saved_search.id),
                "name": saved_search.name,
                "query_params": saved_search.query_params,
                "created_at": saved_search.created_at,
            }
        )

    @action(
        detail=False, methods=["delete"], url_path="saved-search/(?P<search_id>[^/.]+)"
    )
    def delete_saved_search(self, request, search_id=None):
        """Delete a saved search."""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        from .models import SavedSearch

        try:
            saved_search = SavedSearch.objects.get(id=search_id, user=request.user)
            saved_search.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SavedSearch.DoesNotExist:
            return Response(
                {"error": "Saved search not found"}, status=status.HTTP_404_NOT_FOUND
            )


class PromoCodeViewSet(viewsets.ModelViewSet):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only producer's own codes
        user = self.request.user
        # Assuming User has relation to Producer or is Producer?
        # Current model: Producer doesn't link to User explicitly (mock),
        # but let's assume we pass producer_id or handle permissions.
        # For simplicity, returning all for now or filter by query param
        producer_id = self.request.query_params.get("producer")
        if producer_id:
            return PromoCode.objects.filter(producer_id=producer_id)
        return super().get_queryset()

    @action(detail=True, methods=["post"])
    def send_promo(self, request, pk=None):
        promo = self.get_object()
        # Mock SMS
        # "SMS sent to {promo.recipient_phone}: Your code is {promo.code}"
        return Response({"detail": "Promo code sent via SMS"})


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    queryset = Review.objects.all()

    rating_service_class = RatingService

    def get_rating_service(self):
        return self.rating_service_class()

    def get_queryset(self):
        qs = Review.objects.all()
        request = getattr(self, "request", None)
        if request is not None:
            producer_id = request.query_params.get("producer")
            order_id = request.query_params.get("order")
            if producer_id:
                qs = qs.filter(producer_id=producer_id)
            if order_id:
                qs = qs.filter(order_id=order_id)
        return qs.order_by("-created_at")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        order_id = self.request.data.get("order")
        order = Order.objects.get(id=order_id)
        if order.user != self.request.user:
            raise serializers.ValidationError("Not your order")

        photo_url = None
        image = self.request.FILES.get("photo")
        if image:
            from django.core.files.storage import default_storage

            path = default_storage.save(
                f"reviews/{uuid.uuid4().hex}_{image.name}", image
            )
            photo_url = self.request.build_absolute_uri(settings.MEDIA_URL + path)

        review = serializer.save(
            user=self.request.user,
            producer=order.dish.producer,
            order=order,
            photo=photo_url,
        )
        self.get_rating_service().recalc_for_order(order)

    def perform_update(self, serializer):
        instance = self.get_object()

        if instance.is_updated:
            raise serializers.ValidationError("Review can be updated only once")

        photo_url = instance.photo
        image = self.request.FILES.get("photo")
        if image:
            from django.core.files.storage import default_storage

            path = default_storage.save(
                f"reviews/{uuid.uuid4().hex}_{image.name}", image
            )
            photo_url = self.request.build_absolute_uri(settings.MEDIA_URL + path)

        if instance.refund_accepted:
            review = serializer.save(is_updated=True, photo=photo_url)
        else:
            review = serializer.save(photo=photo_url)
        self.get_rating_service().recalc_for_order(instance.order)

    @action(detail=True, methods=["post"])
    def offer_refund(self, request, pk=None):
        review = self.get_object()
        amount = request.data.get("amount")

        if not amount:
            return Response(
                {"detail": "Amount required"}, status=status.HTTP_400_BAD_REQUEST
            )

        review.refund_offered_amount = amount
        review.save()

        # Mock SMS to Buyer
        return Response({"detail": "Refund offer sent to buyer"})

    @action(detail=True, methods=["post"])
    def accept_refund(self, request, pk=None):
        review = self.get_object()
        if review.user != request.user:
            return Response(
                {"detail": "Not your review"}, status=status.HTTP_403_FORBIDDEN
            )

        if not review.refund_offered_amount:
            return Response(
                {"detail": "No refund offered"}, status=status.HTTP_400_BAD_REQUEST
            )

        review.refund_accepted = True
        review.save()

        return Response(
            {"detail": "Offer accepted. Please update your rating to receive funds."}
        )

    @action(detail=True, methods=["post"])
    def raise_dispute(self, request, pk=None):
        review = self.get_object()
        producer = getattr(review, "producer", None)
        producer_user = getattr(producer, "user", None)
        if not producer_user or producer_user != request.user:
            return Response(
                {"detail": "Только владелец магазина может открыть спор по отзыву"},
                status=status.HTTP_403_FORBIDDEN,
            )

        description = (request.data.get("description") or "").strip()
        if not description:
            return Response(
                {"detail": "Описание спора обязательно"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("reason") or "OTHER"
        valid_reasons = [choice[0] for choice in Dispute.REASON_CHOICES]
        if reason not in valid_reasons:
            reason = "OTHER"

        Dispute.objects.create(
            order=review.order, review=review, reason=reason, description=description
        )

        return Response(
            {"detail": "Спор по отзыву открыт"}, status=status.HTTP_201_CREATED
        )


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filterset_fields = ["dish", "created_at", "status", "is_urgent"]

    status_service_class = OrderStatusService

    def get_status_service(self):
        return self.status_service_class()

    def _get_token_role(self):
        role = "CLIENT"
        auth = getattr(self.request, "auth", None)
        if auth:
            try:
                role = auth.get("role", "CLIENT")
            except Exception:
                role = "CLIENT"
        user = getattr(self.request, "user", None)
        if getattr(user, "is_authenticated", False):
            producer = getattr(user, "producer", None)
            if producer:
                return "SELLER"
        return role

    def _get_order_actor_role(self, order):
        user = self.request.user
        if not user.is_authenticated:
            return "ANONYMOUS"
        if user.is_staff or user.is_superuser:
            return "ADMIN"
        if order.user_id == user.id:
            return "BUYER"
        producer = getattr(user, "producer", None)
        if producer:
            producer_id = getattr(producer, "id", None)
            if producer_id and (
                order.producer_id == producer_id
                or order.dish.producer_id == producer_id
            ):
                return "SELLER"
        return "UNKNOWN"

    def _build_order_actor(self, order):
        role = self._get_order_actor_role(order)
        return OrderActor(user=self.request.user, role=role)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()

        # Check Role
        role = self._get_token_role()

        if role == "SELLER":
            # Sellers see orders for their dishes
            return Order.objects.filter(dish__producer__user=user)

        # Clients see their own orders
        return Order.objects.filter(user=user)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        user = self.request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Only sellers can see statistics
        try:
            producer = user.producer
        except:
            return Response(
                {"detail": "Only sellers can access statistics"},
                status=status.HTTP_403_FORBIDDEN,
            )

        time_range = request.query_params.get("time_range", "7d")
        now = timezone.now()

        if time_range == "24h":
            start_date = now - timedelta(hours=24)
        elif time_range == "7d":
            start_date = now - timedelta(days=7)
        elif time_range == "30d":
            start_date = now - timedelta(days=30)
        else:  # 'all' or default
            start_date = None

        orders_base = Order.objects.filter(dish__producer=producer)
        if start_date:
            orders_base = orders_base.filter(created_at__gte=start_date)

        # Basic metrics
        completed_orders = orders_base.filter(status="COMPLETED")
        total_revenue = (
            completed_orders.aggregate(Sum("total_price"))["total_price__sum"] or 0
        )
        orders_count = completed_orders.count()

        # Active orders (not completed, cancelled, or dispute)
        active_orders_count = orders_base.exclude(
            status__in=["COMPLETED", "CANCELLED", "DISPUTE"]
        ).count()

        # Cancelled orders
        cancelled_orders_count = orders_base.filter(status="CANCELLED").count()

        # Average Order Value
        avg_order_value = total_revenue / orders_count if orders_count > 0 else 0

        # Top Dishes
        top_dishes = (
            completed_orders.values("dish__name")
            .annotate(count=Count("id"), revenue=Sum("total_price"))
            .order_by("-count")[:5]
        )

        # Most Popular Toppings
        # selected_toppings is a JSONField (list of dicts)
        # We need to parse it and count. Since it's JSON in SQLite/Postgres, we can do some aggregation.
        # For simplicity, we'll do it in Python for now.
        topping_counts = {}
        for order in completed_orders:
            toppings = order.selected_toppings or []
            for t in toppings:
                name = t.get("name")
                if name:
                    topping_counts[name] = topping_counts.get(name, 0) + 1

        sorted_toppings = sorted(
            topping_counts.items(), key=lambda x: x[1], reverse=True
        )[:5]
        top_toppings = [
            {"name": name, "count": count} for name, count in sorted_toppings
        ]

        # Revenue for chart (grouped by date)
        chart_data = (
            completed_orders.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(revenue=Sum("total_price"), count=Count("id"))
            .order_by("date")
        )

        reviews_qs = Review.objects.filter(producer=producer)
        reviews_count = reviews_qs.count()
        avg_rating_taste = 0
        avg_rating_appearance = 0
        avg_rating_service = 0
        avg_rating_overall = 0

        if reviews_count > 0:
            agg = reviews_qs.aggregate(
                avg_taste=Avg("rating_taste"),
                avg_appearance=Avg("rating_appearance"),
                avg_service=Avg("rating_service"),
            )
            avg_rating_taste = float(agg["avg_taste"] or 0)
            avg_rating_appearance = float(agg["avg_appearance"] or 0)
            avg_rating_service = float(agg["avg_service"] or 0)
            avg_rating_overall = (
                (avg_rating_taste + avg_rating_appearance + avg_rating_service) / 3
                if reviews_count > 0
                else 0
            )

        return Response(
            {
                "total_revenue": float(total_revenue),
                "orders_count": orders_count,
                "active_orders_count": active_orders_count,
                "cancelled_orders_count": cancelled_orders_count,
                "avg_order_value": float(avg_order_value),
                "reviews_count": reviews_count,
                "avg_rating_overall": float(avg_rating_overall),
                "avg_rating_taste": float(avg_rating_taste),
                "avg_rating_appearance": float(avg_rating_appearance),
                "avg_rating_service": float(avg_rating_service),
                "top_dishes": [
                    {
                        "name": item["dish__name"],
                        "count": item["count"],
                        "revenue": float(item["revenue"]),
                    }
                    for item in top_dishes
                ],
                "top_toppings": top_toppings,
                "chart_data": [
                    {
                        "date": item["date"].isoformat(),
                        "revenue": float(item["revenue"]),
                        "count": item["count"],
                    }
                    for item in chart_data
                ],
            }
        )

    @action(detail=False, methods=["post"])
    def estimate(self, request):
        role = "CLIENT"
        if self.request.auth:
            try:
                role = self.request.auth.get("role", "CLIENT")
            except:
                pass
        if role == "SELLER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Продавцы не могут совершать покупки. Пожалуйста, войдите как Покупатель."
            )
        now = timezone.now()
        dish_id = request.data.get("dish")
        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return Response(
                {"detail": "Dish not found"}, status=status.HTTP_400_BAD_REQUEST
            )
        producer = dish.producer
        delivery_type = request.data.get("delivery_type", "BUILDING")
        quantity_raw = request.data.get("quantity", 1)
        try:
            quantity = int(quantity_raw)
        except (TypeError, ValueError):
            quantity = 1
        if quantity <= 0:
            quantity = 1
        base_delivery_price = float(
            producer.delivery_price_to_building
            if delivery_type == "BUILDING"
            else producer.delivery_price_to_door
        )
        zone_for_distance = None
        delivery_lat_raw = request.data.get("delivery_latitude")
        delivery_lon_raw = request.data.get("delivery_longitude")
        if (
            producer.latitude is not None
            and producer.longitude is not None
            and delivery_lat_raw not in (None, "")
            and delivery_lon_raw not in (None, "")
            and producer.delivery_zones
        ):
            try:
                lat1 = float(producer.latitude)
                lon1 = float(producer.longitude)
                lat2 = float(delivery_lat_raw)
                lon2 = float(delivery_lon_raw)
                distance_km = _haversine_km(lat1, lon1, lat2, lon2)
                zones_sorted = sorted(
                    producer.delivery_zones or [],
                    key=lambda z: float(z.get("radius_km") or 0),
                )
                for z in zones_sorted:
                    try:
                        radius = float(z.get("radius_km") or 0)
                    except (TypeError, ValueError):
                        continue
                    if radius <= 0:
                        continue
                    if distance_km <= radius:
                        zone_for_distance = z
                        break
            except (TypeError, ValueError):
                zone_for_distance = None
        if zone_for_distance is not None:
            if delivery_type == "BUILDING":
                base_delivery_price = float(
                    zone_for_distance.get("price_to_building", base_delivery_price)
                )
            else:
                base_delivery_price = float(
                    zone_for_distance.get("price_to_door", base_delivery_price)
                )
        surcharge = 0.0
        current_time_str = now.strftime("%H:%M")
        if producer.delivery_pricing_rules:
            for rule in producer.delivery_pricing_rules:
                start = rule.get("start")
                end = rule.get("end")
                raw_amount = rule.get("surcharge", 0)
                try:
                    amount = float(raw_amount)
                except (TypeError, ValueError):
                    continue
                if start <= current_time_str <= end:
                    surcharge += amount
        delivery_price = base_delivery_price + surcharge
        quantity = int(quantity_raw or 1)
        base_time = dish.cooking_time_minutes
        if quantity > 1:
            total_time = base_time + (base_time * 0.5 * (quantity - 1))
        else:
            total_time = base_time
        if zone_for_distance is not None:
            try:
                zone_time = int(zone_for_distance.get("time_minutes") or 0)
                if zone_time > 0:
                    total_time = total_time + zone_time
            except (TypeError, ValueError):
                pass
        total_price = float(dish.price) * quantity
        total_price += delivery_price
        promo_code_text = request.data.get("promo_code_text")
        discount_amount = 0.0
        if promo_code_text:
            try:
                promo = PromoCode.objects.get(
                    producer=producer, code=promo_code_text, is_used=False
                )
                if promo.reward_type == "DISCOUNT":
                    try:
                        val = float(promo.reward_value)
                        discount_amount = val
                        total_price = max(0.0, total_price - discount_amount)
                    except ValueError:
                        pass
                elif promo.reward_type == "FREE_DELIVERY":
                    discount_amount = delivery_price
                    total_price -= delivery_price
            except PromoCode.DoesNotExist:
                pass
        return Response(
            {
                "delivery_price": float(delivery_price),
                "total_price": float(total_price),
                "discount_amount": float(discount_amount),
                "estimated_cooking_time": int(total_time),
            }
        )

    def perform_create(self, serializer):
        role = "CLIENT"
        if self.request.auth:
            try:
                role = self.request.auth.get("role", "CLIENT")
            except:
                pass

        if role == "SELLER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Продавцы не могут совершать покупки. Пожалуйста, войдите как Покупатель."
            )

        now = timezone.now()
        is_urgent = self.request.data.get("is_urgent", False)
        is_gift = self.request.data.get("is_gift", False)
        minutes_to_accept = 30 if is_urgent else 60

        dish_id = self.request.data.get("dish")
        try:
            dish = Dish.objects.get(id=dish_id)
        except (Dish.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError(
                {"dish": "Блюдо не найдено или недоступно"}
            )
        producer = dish.producer

        if is_gift:
            deadline = None
        else:
            deadline = now + timedelta(minutes=minutes_to_accept)

        delivery_type = self.request.data.get("delivery_type", "BUILDING")
        base_delivery_price = float(
            producer.delivery_price_to_building
            if delivery_type == "BUILDING"
            else producer.delivery_price_to_door
        )

        zone_for_distance = None
        delivery_lat_raw = None
        delivery_lon_raw = None
        if not is_gift:
            delivery_lat_raw = self.request.data.get("delivery_latitude")
            delivery_lon_raw = self.request.data.get("delivery_longitude")
            if (
                producer.latitude is not None
                and producer.longitude is not None
                and delivery_lat_raw not in (None, "")
                and delivery_lon_raw not in (None, "")
                and producer.delivery_zones
            ):
                try:
                    lat1 = float(producer.latitude)
                    lon1 = float(producer.longitude)
                    lat2 = float(delivery_lat_raw)
                    lon2 = float(delivery_lon_raw)
                    distance_km = _haversine_km(lat1, lon1, lat2, lon2)
                    zones_sorted = sorted(
                        producer.delivery_zones or [],
                        key=lambda z: float(z.get("radius_km") or 0),
                    )
                    for z in zones_sorted:
                        try:
                            radius = float(z.get("radius_km") or 0)
                        except (TypeError, ValueError):
                            continue
                        if radius <= 0:
                            continue
                        if distance_km <= radius:
                            zone_for_distance = z
                            break
                except (TypeError, ValueError):
                    zone_for_distance = None

        if zone_for_distance is not None:
            if delivery_type == "BUILDING":
                base_delivery_price = float(
                    zone_for_distance.get("price_to_building", base_delivery_price)
                )
            else:
                base_delivery_price = float(
                    zone_for_distance.get("price_to_door", base_delivery_price)
                )

        surcharge = 0.0
        current_time_str = now.strftime("%H:%M")
        if producer.delivery_pricing_rules:
            for rule in producer.delivery_pricing_rules:
                start = rule.get("start")
                end = rule.get("end")
                raw_amount = rule.get("surcharge", 0)
                try:
                    amount = float(raw_amount)
                except (TypeError, ValueError):
                    continue

                if start <= current_time_str <= end:
                    surcharge += amount

        delivery_price = base_delivery_price + surcharge

        quantity_raw = self.request.data.get("quantity", 1)
        try:
            quantity = int(quantity_raw)
        except (TypeError, ValueError):
            raise serializers.ValidationError({"quantity": "Некорректное количество"})
        if quantity < 1:
            raise serializers.ValidationError(
                {"quantity": "Количество должно быть не меньше 1"}
            )
        base_time = dish.cooking_time_minutes
        if quantity > 1:
            total_time = base_time + (base_time * 0.5 * (quantity - 1))
        else:
            total_time = base_time
        if zone_for_distance is not None:
            try:
                zone_time = int(zone_for_distance.get("time_minutes") or 0)
                if zone_time > 0:
                    total_time = total_time + zone_time
            except (TypeError, ValueError):
                pass

        commission_rate = producer.total_commission_rate

        if self.request.user.is_authenticated:
            is_repeat = Order.objects.filter(
                user=self.request.user, dish__producer=producer, status="COMPLETED"
            ).exists()

            if is_repeat:
                commission_rate = max(0.0, float(commission_rate) - 0.01)

        total_price = float(dish.price) * quantity
        total_price += delivery_price

        promo_code_text = self.request.data.get("promo_code_text")
        applied_promo = None
        discount_amount = 0.0

        if promo_code_text:
            try:
                promo = PromoCode.objects.get(
                    producer=producer, code=promo_code_text, is_used=False
                )

                applied_promo = promo
                promo.is_used = True
                promo.save()

                if promo.reward_type == "DISCOUNT":
                    try:
                        val = float(promo.reward_value)
                        discount_amount = val
                        total_price = max(0.0, total_price - discount_amount)
                    except ValueError:
                        pass
                elif promo.reward_type == "FREE_DELIVERY":
                    discount_amount = delivery_price
                    total_price -= delivery_price
                elif promo.reward_type == "GIFT":
                    pass

            except PromoCode.DoesNotExist:
                pass

        commission_amount = (total_price - delivery_price) * commission_rate

        delivery_address_text = self.request.data.get("delivery_address_text", "") or ""

        serializer.save(
            producer=producer,
            user=self.request.user if self.request.user.is_authenticated else None,
            acceptance_deadline=deadline,
            estimated_cooking_time=int(total_time),
            status="WAITING_FOR_PAYMENT",
            commission_rate_snapshot=commission_rate,
            commission_amount=commission_amount,
            total_price=total_price,
            delivery_price=delivery_price,
            delivery_address_text=delivery_address_text,
            applied_promo_code=applied_promo,
            discount_amount=discount_amount,
        )

    @action(detail=True, methods=["post"])
    def tip(self, request, pk=None):
        order = self.get_object()
        actor_role = self._get_order_actor_role(order)
        if actor_role not in ["BUYER", "ADMIN"]:
            return Response(
                {"detail": "Недостаточно прав для добавления чаевых"},
                status=status.HTTP_403_FORBIDDEN,
            )
        amount = request.data.get("amount")

        if not amount or float(amount) <= 0:
            return Response(
                {"detail": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST
            )

        if order.status != "COMPLETED":
            return Response(
                {"detail": "Can only tip completed orders"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Add to order tips
        order.tips_amount = float(order.tips_amount) + float(amount)
        order.save()

        # Add directly to producer balance (No tax on tips)
        producer = order.dish.producer
        producer.balance = float(producer.balance) + float(amount)
        producer.save()

        return Response({"detail": "Tip added"})

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder(self, request, pk=None):
        """Create a new order based on an existing order."""
        original_order = self.get_object()

        # Create a new order with the same dish and quantity
        new_order_data = {
            "user_name": request.user.get_full_name() or request.user.username,
            "user": request.user.id,
            "phone": getattr(original_order.user.profile, "phone", ""),
            "dish": original_order.dish.id,
            "quantity": original_order.quantity,
            "total_price": original_order.total_price,
            "delivery_type": original_order.delivery_type,
            "delivery_address_text": original_order.delivery_address_text,
            "delivery_latitude": original_order.delivery_latitude,
            "delivery_longitude": original_order.delivery_longitude,
            "delivery_comment": original_order.delivery_comment,
            "apartment": original_order.apartment,
            "entrance": original_order.entrance,
            "floor": original_order.floor,
            "intercom": original_order.intercom,
            "selected_toppings": original_order.selected_toppings,
            "is_urgent": original_order.is_urgent,
            "is_gift": original_order.is_gift,
            "recipient_phone": original_order.recipient_phone,
            "recipient_name": original_order.recipient_name,
            "recipient_address_text": original_order.recipient_address_text,
            "recipient_latitude": original_order.recipient_latitude,
            "recipient_longitude": original_order.recipient_longitude,
            "recipient_specified_time": original_order.recipient_specified_time,
            "gift_proof_image": original_order.gift_proof_image,
        }

        serializer = OrderSerializer(data=new_order_data, context={"request": request})
        if serializer.is_valid():
            new_order = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def simulate_success(self, request, pk=None):
        payment = self.get_object()
        service = PaymentService()
        service.simulate_payment_success(payment)
        return Response({"status": payment.status})

    @action(detail=True, methods=["post"])
    def simulate_fail(self, request, pk=None):
        payment = self.get_object()
        service = PaymentService()
        service.simulate_payment_fail(payment, error_message="Simulated fail")
        return Response({"status": payment.status})

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        payment = self.get_object()
        amount_raw = request.data.get("amount")
        if amount_raw is None:
            return Response(
                {"detail": "amount required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            amount = Decimal(str(amount_raw))
        except Exception:
            return Response(
                {"detail": "invalid amount"}, status=status.HTTP_400_BAD_REQUEST
            )
        service = PaymentService()
        service.refund_payment(payment, amount)
        return Response(
            {
                "status": payment.status,
                "refunded_amount": str(payment.refunded_amount),
            }
        )

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        service = self.get_status_service()
        try:
            updated = service.simulate_payment(order.id)
        except InvalidOrderTransition:
            return Response(
                {"detail": "Invalid status for payment"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Paid/Held", "status": updated.status})

    @action(detail=True, methods=["post"])
    def init_payment(self, request, pk=None):
        order = self.get_object()
        service = PaymentService()
        return_url = request.data.get("return_url") or request.build_absolute_uri()
        try:
            payment, payment_url = service.init_payment(order, return_url=return_url)
        except ValueError:
            return Response(
                {"detail": "Order is not in payment state"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "payment_id": str(payment.id),
                "status": payment.status,
                "payment_url": payment_url,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def get_sbp_qr(self, request, pk=None):
        """Get SBP QR for the order"""
        order = self.get_object()
        payment_id = order.tinkoff_payment_id

        if not payment_id:
            # Maybe try to init first? Or just return error
            return Response(
                {"detail": "Payment not initialized"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = get_client()
        res = client.get_qr(payment_id)

        if res.get("Success"):
            return Response(res)
        else:
            return Response(
                {"detail": res.get("Message", "Tinkoff QR Error")},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.accept_by_seller(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order not waiting for acceptance or SLA expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Order accepted", "status": updated.status})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        reason = request.data.get("reason", "")
        try:
            updated = service.reject_by_seller(order.id, actor, reason=reason)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для отмены заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order cannot be rejected in current status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        producer = updated.dish.producer
        return Response(
            {
                "detail": "Order rejected",
                "producer_banned": getattr(producer, "is_banned", False),
            }
        )

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        order = self.get_object()
        photo = request.FILES.get("photo")
        if not photo:
            return Response(
                {"detail": "Photo file required"}, status=status.HTTP_400_BAD_REQUEST
            )

        from django.core.files.storage import default_storage

        path = default_storage.save(
            f"orders/{order.id}_{uuid.uuid4().hex}_{photo.name}", photo
        )
        url = request.build_absolute_uri(settings.MEDIA_URL + path)

        order.finished_photo = url
        order.status = "READY_FOR_REVIEW"
        order.ready_at = timezone.now()
        order.save()
        return Response(
            {"detail": "Photo uploaded", "photo_url": url, "status": order.status}
        )

    @action(detail=True, methods=["post"])
    def mark_ready(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.mark_ready_by_seller(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order is not in cooking status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Order marked as ready", "status": updated.status})

    @action(detail=True, methods=["post"])
    def approve_photo(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.approve_photo(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order is not in review status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Photo approved", "status": updated.status})

    @action(detail=True, methods=["post"])
    def start_delivery(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.start_delivery(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order not ready for delivery"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Delivery started", "status": updated.status})

    @action(detail=True, methods=["post"])
    def mark_arrived(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.mark_arrived(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order is not being delivered"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Arrived at destination", "status": updated.status})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated = service.complete_by_buyer(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для изменения статуса заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Order cannot be completed yet"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Order completed, funds credited", "status": updated.status}
        )

    @action(detail=True, methods=["post"])
    def raise_dispute(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        reason = request.data.get("reason")
        description = request.data.get("description")
        try:
            service.raise_dispute_by_buyer(order.id, actor, reason, description)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для открытия спора"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Некорректное состояние заказа для спора"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Dispute raised"})

    @action(detail=True, methods=["post"])
    def resolve_dispute(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        resolution = request.data.get("resolution")
        compensation_raw = request.data.get("compensation_amount")
        resolution_notes = request.data.get("resolution_notes")
        compensation_amount = None
        if compensation_raw not in [None, ""]:
            try:
                compensation_amount = Decimal(str(compensation_raw))
            except Exception:
                return Response(
                    {"detail": "Некорректная сумма компенсации"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        service = self.get_status_service()
        try:
            updated = service.resolve_dispute_by_admin(
                order.id,
                actor,
                resolution,
                compensation_amount=compensation_amount,
                resolution_notes=resolution_notes,
            )
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для закрытия спора"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Некорректное состояние спора или заказа"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": f"Dispute resolved: {resolution}", "status": updated.status}
        )

    @action(detail=True, methods=["post"])
    def reschedule_delivery(self, request, pk=None):
        order = self.get_object()
        actor_role = self._get_order_actor_role(order)
        if actor_role not in ["SELLER", "ADMIN"]:
            return Response(
                {"detail": "Недостаточно прав для переноса доставки"},
                status=status.HTTP_403_FORBIDDEN,
            )
        new_time = request.data.get("new_time")

        if not new_time:
            return Response(
                {"detail": "New time required"}, status=status.HTTP_400_BAD_REQUEST
            )

        order.reschedule_requested_by_seller = True
        order.reschedule_new_time = new_time
        order.reschedule_approved_by_buyer = None  # Reset approval
        order.save()

        return Response({"detail": "Reschedule requested, waiting for buyer approval"})

    @action(detail=True, methods=["post"])
    def approve_reschedule(self, request, pk=None):
        order = self.get_object()
        actor_role = self._get_order_actor_role(order)
        if actor_role not in ["BUYER", "ADMIN"]:
            return Response(
                {"detail": "Недостаточно прав для подтверждения переноса"},
                status=status.HTTP_403_FORBIDDEN,
            )
        approved = request.data.get("approved")  # boolean

        if approved is None:
            return Response(
                {"detail": "Approved status required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.reschedule_approved_by_buyer = approved
        order.save()

        if approved:
            # Update order deadline/ready time?
            # Assuming reschedule_new_time is the new "Ready By" or "Delivery By"
            # For now just keeping the flag is enough to show UI
            pass
        else:
            # Rejected -> Cancel Order, Penalty to Seller
            order.status = "CANCELLED"
            order.save()

            producer = order.dish.producer
            producer.penalty_points += 1
            producer.save()

            return Response(
                {"detail": "Reschedule rejected, order cancelled, penalty applied"}
            )

        return Response({"detail": "Reschedule approved"})

    @action(detail=True, methods=["post"])
    def remove_penalty(self, request, pk=None):
        order = self.get_object()
        actor_role = self._get_order_actor_role(order)
        if actor_role not in ["SELLER", "ADMIN"]:
            return Response(
                {"detail": "Недостаточно прав для списания штрафа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        producer = order.dish.producer

        # Check if producer has penalty points
        if producer.penalty_points <= 0:
            return Response(
                {"detail": "No penalty points to remove"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate 30% cost
        cost = float(order.total_price) * 0.30

        if producer.balance < cost:
            return Response(
                {"detail": "Insufficient balance"}, status=status.HTTP_400_BAD_REQUEST
            )

        producer.balance = float(producer.balance) - cost
        producer.penalty_points = max(0, producer.penalty_points - 1)
        producer.save()

        return Response({"detail": "Penalty point removed", "cost": cost})

    @action(detail=True, methods=["post"])
    def cancel_late_delivery(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            service.cancel_late_delivery_by_buyer(order.id, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для отмены заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Not eligible for late cancellation"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Order cancelled due to delay, penalty applied"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        actor = self._build_order_actor(order)
        reason = request.data.get("reason", "")
        service = self.get_status_service()
        try:
            service.cancel_order(order.id, actor, reason=reason)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для отмены заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Некорректное состояние заказа для отмены"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Order cancelled"})

        order = self.get_object()
        actor_role = self._get_order_actor_role(order)
        if actor_role not in ["SELLER", "ADMIN"]:
            return Response(
                {"detail": "Недостаточно прав для уведомления получателя"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not order.is_gift or not order.recipient_phone:
            return Response(
                {"detail": "Not a gift order or no phone"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        needs_new_token = not order.recipient_token or (
            order.recipient_token_expires_at is not None
            and order.recipient_token_expires_at <= now
        )
        if needs_new_token:
            order.recipient_token = uuid.uuid4().hex
            order.recipient_token_expires_at = now + timedelta(days=7)
            order.save(update_fields=["recipient_token", "recipient_token_expires_at"])
        token = order.recipient_token
        phone_raw = order.recipient_phone
        phone_number = re.sub(r"\D", "", phone_raw or "")
        if not phone_number:
            return Response(
                {"detail": "Invalid recipient phone"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(phone_number) == 11 and phone_number.startswith("8"):
            phone_number = "7" + phone_number[1:]
        elif len(phone_number) == 10:
            phone_number = "7" + phone_number
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        gift_details_url = f"{frontend_url}/gift-details/{order.id}?type={order.delivery_type}&token={token}"
        api_id = os.getenv("SMS_API_ID")
        sms_ok = False
        sender_name_sms = "Кто-то"
        if not order.is_anonymous:
            if order.user and order.user.first_name:
                sender_name_sms = order.user.first_name
            elif order.user_name:
                sender_name_sms = order.user_name

        msg_text = f"Вам подарок! Откройте ссылку: {gift_details_url}"
        if not order.is_anonymous:
            msg_text = f"{sender_name_sms} дарит вам подарок! {gift_details_url}"

        if api_id:
            try:
                response = requests.get(
                    "https://sms.ru/sms/send",
                    params={
                        "api_id": api_id,
                        "to": phone_number,
                        "msg": msg_text,
                        "json": 1,
                    },
                    timeout=10,
                )
                data = None
                try:
                    data = response.json()
                except ValueError:
                    data = None
                if (
                    response.status_code == 200
                    and isinstance(data, dict)
                    and str(data.get("status")) == "OK"
                ):
                    sms_ok = True
            except Exception:
                sms_ok = False
        if sms_ok:
            return Response({"detail": "Ссылка отправлена по SMS", "sent_to": "phone"})
        gift = getattr(order, "gift_order", None)
        email_to = None
        if gift and gift.recipient_contact_email:
            email_to = gift.recipient_contact_email
        elif getattr(order, "user", None) and order.user.email:
            email_to = order.user.email
        if not email_to:
            return Response(
                {"detail": "Destination not available"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sender_name = "Кто-то"
        if not order.is_anonymous:
            if order.user and order.user.first_name:
                sender_name = order.user.first_name
            elif order.user_name:
                sender_name = order.user_name

        subject = "Вам отправили подарок"
        if order.is_anonymous:
            plain_message = f"Вам отправили подарок в Food&Home. Откройте ссылку: {gift_details_url}"
        else:
            plain_message = f"{sender_name} отправил(а) вам подарок в Food&Home. Откройте ссылку: {gift_details_url}"
        try:
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [email_to],
                fail_silently=False,
            )
            return Response(
                {"detail": "Ссылка отправлена на email", "sent_to": "email"}
            )
        except Exception:
            return Response(
                {"detail": "Ошибка отправки уведомления"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])


class OrderPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )
        service = OrderStatusService()
        try:
            updated = service.simulate_payment(order.id)
        except InvalidOrderTransition:
            return Response(
                {"detail": "Invalid status for payment"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Paid/Held", "status": updated.status})


class OrderRescheduleDeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )
        new_time = request.data.get("new_time")
        if not new_time:
            return Response(
                {"detail": "New time required"}, status=status.HTTP_400_BAD_REQUEST
            )
        order.reschedule_requested_by_seller = True
        order.reschedule_new_time = new_time
        order.reschedule_approved_by_buyer = None
        order.save()
        return Response({"detail": "Reschedule requested, waiting for buyer approval"})


class OrderApproveRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )
        approved = request.data.get("approved")
        if approved is None:
            return Response(
                {"detail": "Approved status required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_approved = bool(approved)
        order.reschedule_approved_by_buyer = is_approved
        order.save()
        if is_approved:
            return Response({"detail": "Reschedule approved"})
        producer = order.dish.producer
        producer.penalty_points = producer.penalty_points + 1
        producer.save()
        order.status = "CANCELLED"
        order.save()
        return Response(
            {"detail": "Reschedule rejected, order cancelled, penalty applied"}
        )


class OrderCancelLateDeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        service = OrderStatusService()
        actor = OrderActor(user=request.user, role="BUYER")
        try:
            updated = service.cancel_late_delivery_by_buyer(pk, actor)
        except PermissionDeniedForTransition:
            return Response(
                {"detail": "Недостаточно прав для отмены заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except InvalidOrderTransition:
            return Response(
                {"detail": "Not eligible for late cancellation"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "detail": "Order cancelled due to delay, penalty applied",
                "status": updated.status,
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Логирование входящих данных для диагностики
        logger.info(f"RegisterView: Received registration request with data: {request.data}")
        
        email = request.data.get("email", "").strip()
        phone = request.data.get("phone")
        if phone:
            phone = phone.strip()
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        shop_name = request.data.get("shop_name", "")
        role = request.data.get("role", "CLIENT")
        
        logger.info(f"RegisterView: Parsed data - email={email}, phone={phone}, role={role}, first_name={first_name}, shop_name={shop_name}")

        if not email:
            return Response(
                {"detail": "Email обязателен для заполнения"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация сложности пароля
        if password and len(password) < 8:
            return Response(
                {"detail": "Пароль должен содержать минимум 8 символов"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not first_name:
            return Response(
                {"detail": "Имя обязательно для заполнения"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user with this email or phone already exists in active users
        existing_user = get_user_model().objects.filter(email__iexact=email).first()
        is_upgrade_flow = False

        if existing_user:
            has_producer = _safe_has_producer(existing_user)
            # Allow existing users to register as SELLER if they are not already
            if role == "SELLER" and not has_producer:
                is_upgrade_flow = True
            elif role == "SELLER" and has_producer:
                return Response(
                    {
                        "detail": "Вы уже зарегистрированы как продавец. Пожалуйста, войдите.",
                        "code": "producer_exists",
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            else:
                # Role is CLIENT, or other mismatch
                return Response(
                    {
                        "detail": 'Пользователь уже существует. Если вы хотите стать продавцом, выберите роль "Я продавец".',
                        "code": "user_exists_client",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        if phone:
            phone_owner_profile = Profile.objects.filter(phone=phone).first()
            if phone_owner_profile:
                if is_upgrade_flow and phone_owner_profile.user == existing_user:
                    pass  # Same user, allow
                elif not existing_user:
                    # New registration attempt (email not found), but phone is already used.
                    # This implies the user has an account with this phone but a different email.
                    return Response(
                        {
                            "detail": "Этот номер телефона уже зарегистрирован с другим email адресом. Проверьте email или восстановите доступ.",
                            "code": "phone_exists_diff_email",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
                else:
                    # Email exists (so upgrading or duplicate), but phone belongs to SOMEONE ELSE.
                    return Response(
                        {
                            "detail": "Этот номер телефона уже привязан к другому аккаунту. Пожалуйста, используйте другой номер или войдите в аккаунт, к которому он привязан.",
                            "code": "phone_exists",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

        # Validate basic data with serializer (without saving)
        if not is_upgrade_flow:
            serializer = RegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"RegisterView: Serializer validation failed. Errors: {serializer.errors}")
                logger.error(f"RegisterView: Request data that failed validation: {request.data}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Generate code
            code = str(random.randint(100000, 999999))

            # Store in PendingRegistration (update if exists)
            # If upgrading, password might not be needed/provided, but model requires it.
            # Use existing user's password hash or a dummy if missing?
            # Actually, verify logic ignores password for upgrade flow.
            pending_defaults = {
                "phone": phone,
                "first_name": first_name,
                "last_name": last_name,
                "shop_name": shop_name,
                "role": role,
                "verification_code": code,
            }
            if password:
                pending_defaults["password"] = password
            elif is_upgrade_flow:
                # If upgrading and no password provided, use dummy or keep existing?
                # update_or_create will NOT update fields not in defaults.
                # But if creating new PendingRegistration, we need password.
                # We can put a dummy value since it won't be used for user creation.
                pending_defaults["password"] = "upgrade_placeholder"

            PendingRegistration.objects.update_or_create(
                email=email, defaults=pending_defaults
            )

            # Send email
            try:
                html_message = render_to_string(
                    "emails/verification_code.html", {"code": code}
                )
                plain_message = strip_tags(html_message)

                send_mail(
                    "Your Verification Code",
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                    html_message=html_message,
                )
            except Exception as e:
                print(f"Error sending email: {e}")
                print(f"============================================")
                print(f"REGISTER EMAIL CODE for {email}: {code}")
                print(f"============================================")
                return Response(
                    {
                        "detail": "Ошибка отправки email. Проверьте адрес или попробуйте позже."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"email": email, "detail": "Verification code sent"},
            status=status.HTTP_200_OK,
        )


class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get(
            "email"
        )  # Frontend sends 'email' key even for phone
        if not identifier:
            return Response(
                {"detail": "Email or phone required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        user = None
        found_by_phone = False

        # Try finding by email
        try:
            user = User.objects.get(email__iexact=identifier)
        except User.DoesNotExist:
            pass

        # Try finding by phone if not found by email
        if not user:
            try:
                profile = Profile.objects.get(phone=identifier)
                user = profile.user
                found_by_phone = True
            except Profile.DoesNotExist:
                pass

        if not user:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        code = str(random.randint(100000, 999999))
        VerificationCode.objects.create(user=user, code=code)

        if found_by_phone or (
            hasattr(user, "profile")
            and user.profile.phone
            and identifier
            and re.sub(r"\\D", "", identifier) == re.sub(r"\\D", "", user.profile.phone)
        ):
            api_id = os.getenv("SMS_API_ID")
            if api_id and user.profile.phone:
                try:
                    phone_number = re.sub(r"\\D", "", user.profile.phone)
                    if len(phone_number) == 11 and phone_number.startswith("8"):
                        phone_number = "7" + phone_number[1:]
                    elif len(phone_number) == 10:
                        phone_number = "7" + phone_number
                    response = requests.get(
                        "https://sms.ru/sms/send",
                        params={
                            "api_id": api_id,
                            "to": phone_number,
                            "msg": f"Reset code: {code}",
                            "json": 1,
                        },
                        timeout=10,
                    )
                    data = None
                    try:
                        data = response.json()
                    except ValueError:
                        data = None
                    if (
                        response.status_code == 200
                        and isinstance(data, dict)
                        and str(data.get("status")) == "OK"
                    ):
                        return Response(
                            {"detail": "Code sent to phone", "sent_to": "phone"},
                            status=status.HTTP_200_OK,
                        )
                except Exception as e:
                    print(f"Error sending SMS via sms.ru: {e}")

        # Send Email as fallback or primary
        if user.email:
            try:
                html_message = render_to_string(
                    "emails/password_reset.html", {"code": code}
                )
                plain_message = strip_tags(html_message)

                send_mail(
                    "Password Reset Code",
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                    html_message=html_message,
                )
                return Response(
                    {"detail": "Code sent to email", "sent_to": "email"},
                    status=status.HTTP_200_OK,
                )
            except Exception as e:
                print(f"Error sending email: {e}")
                return Response(
                    {"detail": "Ошибка отправки email. Попробуйте позже."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {"detail": "Destination not available"}, status=status.HTTP_400_BAD_REQUEST
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("email")  # Frontend sends 'email' key
        code = request.data.get("code")
        new_password = request.data.get("password")

        User = get_user_model()
        user = None

        try:
            user = User.objects.get(email__iexact=identifier)
        except User.DoesNotExist:
            # Try phone
            try:
                profile = Profile.objects.get(phone=identifier)
                user = profile.user
            except Profile.DoesNotExist:
                return Response(
                    {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
                )

        verification = (
            VerificationCode.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if verification and verification.is_valid():
            verification.is_used = True
            verification.save()

            user.set_password(new_password)
            user.save()

            return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)


class VerifyRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        email = request.data.get("email")
        code = request.data.get("code")
        User = get_user_model()
        
        logger.info(f"VerifyRegistration attempt - Email: {email}, Code provided: {bool(code)}")

        # Check PendingRegistration
        try:
            pending_reg = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            return Response(
                {"detail": "Registration request not found or expired"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if pending_reg.verification_code != code:
            return Response(
                {"detail": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not pending_reg.is_valid():
            return Response(
                {"detail": "Code expired"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Create actual User and Profile
        try:
            with transaction.atomic():
                # Check if user already exists (for role upgrade flow)
                user = User.objects.filter(email=pending_reg.email).first()

                if not user:
                    user = User.objects.create_user(
                        username=pending_reg.email,  # Using email as username
                        email=pending_reg.email,
                        password=pending_reg.password,
                        first_name=pending_reg.first_name,
                        last_name=pending_reg.last_name,
                    )
                    user.is_active = True
                    user.save()

                    Profile.objects.create(user=user, phone=pending_reg.phone or "")
                else:
                    # User exists - update phone if provided and missing?
                    if (
                        pending_reg.phone
                        and hasattr(user, "profile")
                        and not user.profile.phone
                    ):
                        user.profile.phone = pending_reg.phone
                        user.profile.save()

                # Determine role
                role = "CLIENT"
                if hasattr(pending_reg, "role") and pending_reg.role:
                    role = pending_reg.role
                
                logger.info(f"Verification - User: {user.email}, Role: {role}, Has producer: {_safe_has_producer(user)}")

                # Create Producer if role is SELLER
                if role == "SELLER" and not _safe_has_producer(user):
                    logger.info(f"Creating Producer for user {user.email} (user was created: {user.email == pending_reg.email})")
                    shop_name = getattr(pending_reg, "shop_name", "")
                    if not shop_name:
                        shop_name = (
                            f"{pending_reg.first_name} {pending_reg.last_name}".strip()
                            or "Новый продавец"
                        )
                    logger.info(f"Shop name for Producer: {shop_name}")
                    moderation = moderate_shop_name(shop_name)
                    logger.info(f"Moderation result: {moderation}")
                    if not moderation.get("approved"):
                        logger.warning(f"Shop name '{shop_name}' did not pass moderation")
                        return Response(
                            {"detail": "Название магазина не прошло модерацию"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    try:
                        producer = Producer.objects.create(
                            user=user, name=shop_name, city="Москва"  # Default city
                        )
                        logger.info(f"Producer created successfully - ID: {producer.id}, User: {user.email}, Name: {producer.name}")
                    except Exception as e:
                        logger.error(f"Error creating Producer for user {user.email}: {str(e)}", exc_info=True)
                        return Response(
                            {"detail": f"Ошибка создания профиля продавца: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )
                elif role == "SELLER" and _safe_has_producer(user):
                    logger.info(f"User {user.email} already has Producer profile, skipping creation")
                elif role == "CLIENT":
                    logger.info(f"User {user.email} is registering as CLIENT, no Producer needed")

                # Delete pending registration
                pending_reg.delete()

                refresh = RefreshToken.for_user(user)
                refresh["role"] = role
                refresh.access_token["role"] = role

                track_device(user, request)
                return Response(
                    {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                        "role": role,
                        "is_seller": _safe_has_producer(user),
                    },
                    status=status.HTTP_200_OK,
                )
        except Exception as e:
            logger.error(f"Error in VerifyRegistrationView: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Error creating user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile, _ = Profile.objects.get_or_create(user=request.user)
            if profile.auth_provider == "GOOGLE":
                return Response(
                    {"detail": "2FA недоступна для Google аккаунта"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            enabled = request.data.get("enabled")
            profile.is_2fa_enabled = bool(enabled)
            profile.save()

            return Response({"status": "updated", "enabled": profile.is_2fa_enabled})
        except Exception as e:
            return Response(
                {"detail": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in ("1", "true", "yes", "y", "on"):
        return True
    if s in ("0", "false", "no", "n", "off"):
        return False
    return bool(value)


def _parse_hhmm_to_minutes(value):
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not re.match(r"^\d{2}:\d{2}$", s):
        return None
    hh = int(s[0:2])
    mm = int(s[3:5])
    if hh < 0 or hh > 23 or mm < 0 or mm > 59:
        return None
    return hh * 60 + mm


def _safe_has_producer(user):
    try:
        return hasattr(user, "producer")
    except (OperationalError, ProgrammingError):
        return False


def _parse_int(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _normalize_delivery_pricing_rules(value):
    if value is None:
        return None
    if not isinstance(value, list):
        raise ValueError("delivery_pricing_rules должен быть массивом")

    normalized = []
    for item in value:
        if not isinstance(item, dict):
            continue
        start = str(item.get("start") or "").strip()
        end = str(item.get("end") or "").strip()
        if _parse_hhmm_to_minutes(start) is None or _parse_hhmm_to_minutes(end) is None:
            continue
        surcharge = _parse_float(item.get("surcharge"))
        if surcharge is None:
            surcharge = 0.0
        if surcharge < 0:
            continue
        normalized.append({"start": start, "end": end, "surcharge": surcharge})
        if len(normalized) >= 12:
            break

    return normalized




class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        data = request.data

        if "first_name" in data:
            user.first_name = data["first_name"]
        if "last_name" in data:
            user.last_name = data["last_name"]

        producer = getattr(user, "producer", None)
        if producer:
            producer_changed = False

            if "shop_name" in data:
                new_name = str(data.get("shop_name") or "").strip()
                if new_name and new_name != producer.name:
                    moderation = moderate_shop_name(new_name)
                    if not moderation.get("approved"):
                        return Response(
                            {"detail": "Название магазина не прошло модерацию"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    producer.name = new_name
                    producer_changed = True

            if "city" in data:
                producer.city = str(data.get("city") or "").strip()
                producer_changed = True

            if "address" in data:
                producer.address = str(data.get("address") or "").strip()
                producer_changed = True

            if "latitude" in data:
                producer.latitude = data.get("latitude") or None
                producer_changed = True

            if "longitude" in data:
                producer.longitude = data.get("longitude") or None
                producer_changed = True

            if "opening_time" in data:
                producer.opening_time = data.get("opening_time")
                producer_changed = True

            if "closing_time" in data:
                producer.closing_time = data.get("closing_time")
                producer_changed = True

            if "short_description" in data:
                producer.short_description = str(data.get("short_description") or "")
                producer_changed = True

            if "description" in data:
                producer.description = str(data.get("description") or "")
                producer_changed = True

            if "logo_url" in data:
                producer.logo_url = str(data.get("logo_url") or "").strip()
                producer_changed = True

            if "main_category" in data:
                cat_id = data.get("main_category")
                if not cat_id:
                    producer.main_category = None
                else:
                    try:
                        producer.main_category = Category.objects.get(id=cat_id)
                    except (Category.DoesNotExist, ValidationError, ValueError):
                        return Response(
                            {"detail": "Категория не найдена"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                producer_changed = True

            if "is_hidden" in data:
                parsed = _parse_bool(data.get("is_hidden"))
                if parsed is not None:
                    producer.is_hidden = bool(parsed)
                    producer_changed = True

            if "delivery_radius_km" in data:
                v = _parse_float(data.get("delivery_radius_km"))
                if v is not None and v > 0:
                    producer.delivery_radius_km = v
                    producer_changed = True

            if "delivery_price_to_building" in data:
                v = _parse_float(data.get("delivery_price_to_building"))
                if v is not None and v >= 0:
                    producer.delivery_price_to_building = v
                    producer_changed = True

            if "delivery_price_to_door" in data:
                v = _parse_float(data.get("delivery_price_to_door"))
                if v is not None and v >= 0:
                    producer.delivery_price_to_door = v
                    producer_changed = True

            if "delivery_time_minutes" in data:
                v = _parse_int(data.get("delivery_time_minutes"))
                if v is not None and v > 0:
                    producer.delivery_time_minutes = v
                    producer_changed = True

            if "delivery_pricing_rules" in data:
                try:
                    normalized = _normalize_delivery_pricing_rules(
                        data.get("delivery_pricing_rules")
                    )
                except ValueError as e:
                    return Response(
                        {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
                    )
                if normalized is not None:
                    producer.delivery_pricing_rules = normalized
                    producer_changed = True

            if "delivery_zones" in data:
                try:
                    normalized = _normalize_delivery_zones(data.get("delivery_zones"))
                except ValueError as e:
                    return Response(
                        {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
                    )
                if normalized is not None:
                    producer.delivery_zones = normalized
                    if len(normalized) > 0:
                        first = normalized[0]
                        producer.delivery_radius_km = first.get(
                            "radius_km", producer.delivery_radius_km
                        )
                        producer.delivery_price_to_building = first.get(
                            "price_to_building", producer.delivery_price_to_building
                        )
                        producer.delivery_price_to_door = first.get(
                            "price_to_door", producer.delivery_price_to_door
                        )
                        producer.delivery_time_minutes = first.get(
                            "time_minutes", producer.delivery_time_minutes
                        )
                    producer_changed = True

            if "pickup_enabled" in data:
                parsed = _parse_bool(data.get("pickup_enabled"))
                if parsed is not None:
                    producer.pickup_enabled = bool(parsed)
                    producer_changed = True

            if "weekly_schedule" in data:
                try:
                    normalized = _normalize_weekly_schedule(data.get("weekly_schedule"))
                except ValueError as e:
                    return Response(
                        {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
                    )
                if normalized is not None:
                    producer.weekly_schedule = normalized
                    producer_changed = True

            if "requisites" in data:
                producer.requisites = data.get("requisites")
                producer_changed = True

            if "employees" in data:
                producer.employees = data.get("employees")
                producer_changed = True

            if "documents" in data:
                producer.documents = data.get("documents")
                producer_changed = True

            if producer_changed:
                producer.save()

        user.save()

        # Return updated profile
        profile, _ = Profile.objects.get_or_create(user=user)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)


class EmailLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        # Логирование для диагностики
        logger.info(f"Login attempt - Method: {request.method}, Path: {request.path}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request data: {request.data}")
        logger.info(f"Content-Type: {request.content_type}")
        
        email = request.data.get("email")
        password = request.data.get("password")
        role = request.data.get("role", "CLIENT")  # Get requested role

        User = get_user_model()
        is_phone_login = False
        
        # Логирование полученных данных
        logger.info(f"Login attempt - Email: {email}, Password provided: {bool(password)}, Role: {role}")
        
        # Валидация входных данных
        if not email:
            logger.warning("Login attempt failed: Email is required")
            return Response(
                {"detail": "Email или номер телефона обязателен"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not password:
            logger.warning(f"Login attempt failed: Password is required for {email}")
            return Response(
                {"detail": "Пароль обязателен"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            user = User.objects.get(email__iexact=email)
            logger.info(f"User found: {user.email}, Active: {user.is_active}")
        except User.DoesNotExist:
            # Try phone
            try:
                profile = Profile.objects.get(phone=email)
                user = profile.user
                is_phone_login = True
                logger.info(f"User found via phone: {user.email}, Active: {user.is_active}")
            except Profile.DoesNotExist:
                logger.warning(f"User not found - Email: {email}, Phone: {email}")
                return Response(
                    {
                        "detail": "Пользователь с указанным email или номером телефона не найден",
                        "error_code": "USER_NOT_FOUND"
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        if not user.check_password(password):
            logger.warning(f"Invalid password for user: {user.email}")
            return Response(
                {
                    "detail": "Неверный пароль",
                    "error_code": "INVALID_PASSWORD"
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        if not user.is_active:
            logger.warning(f"Inactive user login attempt: {user.email}")
            return Response(
                {
                    "detail": "Ваш аккаунт деактивирован. Обратитесь в поддержку для восстановления доступа.",
                    "error_code": "ACCOUNT_DEACTIVATED"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check Role Eligibility
        producer_created = False  # Флаг для отслеживания автоматического создания Producer
        if role == "SELLER":
            has_producer = _safe_has_producer(user)
            logger.info(f"SELLER login check - User: {user.email}, Has producer: {has_producer}")
            
            # Дополнительная диагностика - проверяем Producer в базе данных
            from api.models import Producer
            producer_exists = Producer.objects.filter(user=user).exists()
            logger.info(f"SELLER login check - Producer exists in DB: {producer_exists}")
            
            if not has_producer:
                logger.info(f"User {user.email} attempted SELLER login without producer profile - attempting auto-creation")
                
                # Автоматическое создание Producer профиля
                shop_name = f"Магазин {user.first_name or user.email.split('@')[0]}"
                success, producer, message = _create_producer_for_user(user, shop_name=shop_name)
                
                if not success:
                    logger.error(f"Failed to auto-create Producer for user {user.email}: {message}")
                    return Response(
                        {
                            "detail": f"Не удалось создать профиль продавца: {message}",
                            "error_code": "SELLER_PROFILE_CREATION_FAILED"
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                
                logger.info(f"Successfully auto-created Producer for user {user.email}: {message}")
                # Обновляем флаг наличия producer
                has_producer = True
                producer_created = True
            # Дополнительная проверка статуса профиля продавца
            try:
                producer = user.producer
                if producer.is_banned:
                    logger.warning(f"User {user.email} attempted SELLER login with banned producer profile")
                    return Response(
                        {
                            "detail": "Ваш профиль продавца заблокирован. Обратитесь в поддержку.",
                            "error_code": "SELLER_PROFILE_BANNED"
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if producer.is_hidden:
                    logger.warning(f"User {user.email} attempted SELLER login with hidden producer profile")
                    return Response(
                        {
                            "detail": "Ваш профиль продавца временно недоступен. Обратитесь в поддержку.",
                            "error_code": "SELLER_PROFILE_HIDDEN"
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Exception:
                # Если producer не существует, ошибка уже обработана выше
                pass

        # Check 2FA
        try:
            profile, _ = Profile.objects.get_or_create(user=user)
            if profile.is_2fa_enabled:
                code = str(random.randint(100000, 999999))
                # Store role in VerificationCode context if needed?
                # Actually VerificationCode is just code. We need to pass role to Verify2FALoginView.
                # So we return it to frontend and frontend sends it back to Verify2FALoginView?
                # Or we store it in session? Stateless is better. Frontend should send it again.

                VerificationCode.objects.create(user=user, code=code)

                # For development/testing: Print code to console
                print(f"============================================")
                print(f"SMS VERIFICATION CODE for {profile.phone}: {code}")
                print(f"============================================")

                destination = "email"
                if is_phone_login and profile.phone:
                    destination = "phone"
                    api_id = os.getenv("SMS_API_ID")
                    if api_id:
                        try:
                            phone_number = re.sub(r"\D", "", profile.phone)
                            if len(phone_number) == 11 and phone_number.startswith("8"):
                                phone_number = "7" + phone_number[1:]
                            elif len(phone_number) == 10:
                                phone_number = "7" + phone_number
                            response = requests.get(
                                "https://sms.ru/sms/send",
                                params={
                                    "api_id": api_id,
                                    "to": phone_number,
                                    "msg": f"Your verification code: {code}",
                                    "json": 1,
                                },
                                timeout=10,
                            )
                            try:
                                print(f"sms.ru response: {response.json()}")
                            except Exception:
                                pass
                        except Exception as e:
                            print(f"Error sending SMS via sms.ru: {e}")
                else:
                    # Send Email
                    try:
                        html_message = render_to_string(
                            "emails/verification_code.html", {"code": code}
                        )
                        plain_message = strip_tags(html_message)

                        send_mail(
                            "Your 2FA Code",
                            plain_message,
                            settings.DEFAULT_FROM_EMAIL,
                            [user.email],
                            fail_silently=False,
                            html_message=html_message,
                        )
                    except Exception as e:
                        print(f"Error sending email: {e}")
                        return Response(
                            {"detail": "Ошибка отправки email. Попробуйте позже."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                return Response(
                    {
                        "requires_2fa": True,
                        "email": user.email,
                        "phone": profile.phone if destination == "phone" else None,
                        "sent_to": destination,
                        "detail": "2FA code sent",
                    },
                    status=status.HTTP_200_OK,
                )
        except Profile.DoesNotExist:
            pass

        refresh = RefreshToken.for_user(user)
        # Add role to tokens
        refresh["role"] = role
        refresh.access_token["role"] = role

        track_device(user, request)

        # Формируем ответ
        response_data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "role": role,
            "is_seller": _safe_has_producer(user),
            "user": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }
        
        # Добавляем информацию о создании Producer, если это произошло
        if producer_created:
            response_data["producer_created"] = True
            response_data["producer_name"] = user.producer.name if hasattr(user, "producer") else None
            logger.info(f"Login response includes producer_created=True for user {user.email}")

        return Response(response_data, status=status.HTTP_200_OK)


class Verify2FALoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        email = request.data.get("email")
        code = request.data.get("code")
        role = request.data.get("role", "CLIENT")
        User = get_user_model()

        # Валидация входных данных
        if not email:
            return Response(
                {"detail": "Email или номер телефона обязателен", "error_code": "EMAIL_REQUIRED"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not code:
            return Response(
                {"detail": "Код подтверждения обязателен", "error_code": "CODE_REQUIRED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Try phone
            try:
                profile = Profile.objects.get(phone=email)
                user = profile.user
            except Profile.DoesNotExist:
                logger.warning(f"Verify2FA - User not found: {email}")
                return Response(
                    {"detail": "Пользователь не найден", "error_code": "USER_NOT_FOUND"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Check Role Eligibility
        producer_created = False  # Флаг для отслеживания автоматического создания Producer
        if role == "SELLER":
            has_producer = _safe_has_producer(user)
            logger.info(f"Verify2FA - SELLER login check - User: {user.email}, Has producer: {has_producer}")
            
            if not has_producer:
                logger.info(f"Verify2FA - User {user.email} attempted SELLER login without producer profile - attempting auto-creation")
                
                # Автоматическое создание Producer профиля
                shop_name = f"Магазин {user.first_name or user.email.split('@')[0]}"
                success, producer, message = _create_producer_for_user(user, shop_name=shop_name)
                
                if not success:
                    logger.error(f"Verify2FA - Failed to auto-create Producer for user {user.email}: {message}")
                    return Response(
                        {
                            "detail": f"Не удалось создать профиль продавца: {message}",
                            "error_code": "SELLER_PROFILE_CREATION_FAILED"
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                
                logger.info(f"Verify2FA - Successfully auto-created Producer for user {user.email}: {message}")
                has_producer = True
                producer_created = True
            
            # Проверка статуса профиля продавца
            try:
                producer = user.producer
                if producer.is_banned:
                    logger.warning(f"Verify2FA - User {user.email} attempted SELLER login with banned producer profile")
                    return Response(
                        {
                            "detail": "Ваш профиль продавца заблокирован. Обратитесь в поддержку.",
                            "error_code": "SELLER_PROFILE_BANNED"
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if producer.is_hidden:
                    logger.warning(f"Verify2FA - User {user.email} attempted SELLER login with hidden producer profile")
                    return Response(
                        {
                            "detail": "Ваш профиль продавца временно недоступен. Обратитесь в поддержку.",
                            "error_code": "SELLER_PROFILE_HIDDEN"
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Exception:
                pass

        verification = (
            VerificationCode.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if verification and verification.is_valid():
            verification.is_used = True
            verification.save()

            refresh = RefreshToken.for_user(user)
            refresh["role"] = role
            refresh.access_token["role"] = role

            track_device(user, request)
            
            # Формируем ответ
            response_data = {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": role,
            }
            
            # Добавляем информацию о создании Producer, если это произошло
            if producer_created:
                response_data["producer_created"] = True
                response_data["producer_name"] = user.producer.name if hasattr(user, "producer") else None
                logger.info(f"Verify2FA response includes producer_created=True for user {user.email}")
            
            return Response(response_data, status=status.HTTP_200_OK)

        logger.warning(f"Verify2FA - Invalid or expired code for user: {user.email}")
        return Response(
            {"detail": "Неверный или истекший код подтверждения", "error_code": "INVALID_OR_EXPIRED_CODE"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        User = get_user_model()

        is_phone_login = False
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Try phone for resend too
            try:
                profile = Profile.objects.get(phone=email)
                user = profile.user
                is_phone_login = True
            except Profile.DoesNotExist:
                return Response(
                    {"detail": "Code sent if account exists"}, status=status.HTTP_200_OK
                )

        code = str(random.randint(100000, 999999))
        VerificationCode.objects.create(user=user, code=code)

        # For development/testing: Print code to console
        print(f"============================================")
        print(
            f"RESENT SMS CODE for {user.profile.phone if is_phone_login else user.email}: {code}"
        )
        print(f"============================================")

        if is_phone_login and user.profile.phone:
            api_id = os.getenv("SMS_API_ID")
            if api_id:
                try:
                    phone_number = re.sub(r"\D", "", user.profile.phone)
                    if len(phone_number) == 11 and phone_number.startswith("8"):
                        phone_number = "7" + phone_number[1:]
                    elif len(phone_number) == 10:
                        phone_number = "7" + phone_number
                    response = requests.get(
                        "https://sms.ru/sms/send",
                        params={
                            "api_id": api_id,
                            "to": phone_number,
                            "msg": code,
                            "json": 1,
                        },
                        timeout=10,
                    )
                    try:
                        print(f"sms.ru resend response: {response.json()}")
                    except Exception:
                        pass
                except Exception as e:
                    print(f"Error sending SMS via sms.ru: {e}")
        else:
            try:
                html_message = render_to_string(
                    "emails/verification_code.html", {"code": code}
                )
                plain_message = strip_tags(html_message)

                send_mail(
                    "Your Verification Code",
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                    html_message=html_message,
                )
            except Exception as e:
                print(f"Error sending email: {e}")
                return Response(
                    {"detail": "Ошибка отправки email. Попробуйте позже."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response({"detail": "Code sent"}, status=status.HTTP_200_OK)


class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        from .models import Address

        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Max

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_data = CartSerializer(cart).data

        # Calculate total cooking time as the maximum cooking time among all items
        total_cooking_time = 0
        if hasattr(cart, "items") and cart.items.exists():
            max_time = cart.items.aggregate(
                max_cooking_time=Max("dish__cooking_time_minutes")
            )["max_cooking_time"]
            if max_time:
                total_cooking_time = max_time

        cart_data["total_cooking_time"] = total_cooking_time
        return Response(cart_data, status=status.HTTP_200_OK)


class CartAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        dish_id = request.data.get("dish")
        quantity = request.data.get("quantity")
        selected_toppings = request.data.get("selected_toppings", [])

        try:
            quantity = int(quantity) if quantity is not None else 1
        except (TypeError, ValueError):
            quantity = 1
        if quantity < 1:
            return Response(
                {"detail": "quantity должен быть >= 1"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return Response(
                {"detail": "Блюдо не найдено"}, status=status.HTTP_404_NOT_FOUND
            )
        cart, _ = Cart.objects.get_or_create(user=request.user)

        if dish.max_quantity_per_order:
            existing = cart.items.filter(
                dish=dish, selected_toppings=selected_toppings
            ).first()
            existing_qty = existing.quantity if existing else 0
            max_qty = int(dish.max_quantity_per_order)
            if existing_qty + quantity > max_qty:
                return Response(
                    {"detail": f"Максимум {max_qty} шт. на заказ"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        _, created = cart.add_item(
            dish, quantity=quantity, selected_toppings=selected_toppings
        )

        if created:
            dish.in_cart_count += 1
            dish.save(update_fields=["in_cart_count"])

        data = CartSerializer(cart).data
        return Response(data, status=status.HTTP_200_OK)


class CartRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        dish_id = request.data.get("dish")
        selected_toppings = request.data.get("selected_toppings", [])
        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return Response(
                {"detail": "Блюдо не найдено"}, status=status.HTTP_404_NOT_FOUND
            )
        cart, _ = Cart.objects.get_or_create(user=request.user)

        try:
            item = cart.items.get(dish=dish, selected_toppings=selected_toppings)
            item.delete()
            dish.in_cart_count = max(0, dish.in_cart_count - 1)
            dish.save(update_fields=["in_cart_count"])
        except CartItem.DoesNotExist:
            pass

        data = CartSerializer(cart).data
        return Response(data, status=status.HTTP_200_OK)


class CartClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)

        # Decrement counts before clearing
        for item in cart.items.all():
            dish = item.dish
            dish.in_cart_count = max(0, dish.in_cart_count - 1)
            dish.save(update_fields=["in_cart_count"])

        cart.clear()
        data = CartSerializer(cart).data
        return Response(data, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        token = request.data.get("token")
        role = str(request.data.get("role") or "CLIENT").upper()
        if role not in ("CLIENT", "SELLER"):
            role = "CLIENT"
        
        if not token:
            return Response(
                {"detail": "Токен Google обязателен", "error_code": "TOKEN_REQUIRED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Try to validate as Google Access Token (for custom UI flow)
            user_info_resp = requests.get(
                f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}"
            )

            if user_info_resp.status_code == 200:
                user_data = user_info_resp.json()
                email = user_data.get("email")
                first_name = user_data.get("given_name", "")
                last_name = user_data.get("family_name", "")
            else:
                # Fallback: Try to validate as ID Token (standard GSI flow)
                # Specify the CLIENT_ID of the app that accesses the backend:
                CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
                if not CLIENT_ID:
                    logger.warning("GOOGLE_CLIENT_ID not set in env")
                    return Response(
                        {"detail": "Ошибка конфигурации Google OAuth. Обратитесь к администратору.", "error_code": "GOOGLE_CONFIG_ERROR"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Verify the token
                id_info = id_token.verify_oauth2_token(
                    token, google_requests.Request(), CLIENT_ID
                )

                # ID token is valid. Get the user's Google Account info from the decoded token.
                email = id_info.get("email")
                first_name = id_info.get("given_name", "")
                last_name = id_info.get("family_name", "")

            if not email:
                return Response(
                    {"detail": "Email не найден в токене Google", "error_code": "EMAIL_NOT_IN_TOKEN"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            User = get_user_model()

            # Check if user exists
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Create user
                password = get_random_string(length=32)
                user = User.objects.create_user(
                    username=email, email=email, password=password
                )
                user.first_name = first_name
                user.last_name = last_name
                user.save()

                Profile.objects.get_or_create(user=user)

            if role == "SELLER" and not _safe_has_producer(user):
                shop_name = f"{first_name} {last_name}".strip() or "Новый продавец"
                moderation = moderate_shop_name(shop_name)
                if not moderation.get("approved"):
                    reason = moderation.get("reason", "unknown")
                    logger.warning(f"Google login - Shop name moderation failed for {email}: {reason}")
                    return Response(
                        {"detail": "Название магазина не прошло модерацию", "error_code": "SHOP_NAME_MODERATION_FAILED"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                Producer.objects.create(user=user, name=shop_name, city="Москва")

            # Check Role Eligibility
            if role == "SELLER":
                if not _safe_has_producer(user):
                    logger.warning(f"Google login - User {user.email} attempted SELLER login without producer profile")
                    return Response(
                        {
                            "detail": "У вас нет профиля продавца. Пожалуйста, зарегистрируйтесь как продавец.",
                            "error_code": "SELLER_PROFILE_NOT_FOUND"
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                # Проверка статуса профиля продавца
                try:
                    producer = user.producer
                    if producer.is_banned:
                        logger.warning(f"Google login - User {user.email} attempted SELLER login with banned producer profile")
                        return Response(
                            {
                                "detail": "Ваш профиль продавца заблокирован. Обратитесь в поддержку.",
                                "error_code": "SELLER_PROFILE_BANNED"
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
                    if producer.is_hidden:
                        logger.warning(f"Google login - User {user.email} attempted SELLER login with hidden producer profile")
                        return Response(
                            {
                                "detail": "Ваш профиль продавца временно недоступен. Обратитесь в поддержку.",
                                "error_code": "SELLER_PROFILE_HIDDEN"
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Exception:
                    pass

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            refresh["role"] = role
            refresh.access_token["role"] = role

            profile, _ = Profile.objects.get_or_create(user=user)
            profile.auth_provider = "GOOGLE"
            profile.save()

            track_device(user, request)

            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": role,
                }
            )

        except ValueError as e:
            # Invalid token
            logger.warning(f"Google login - Invalid token: {str(e)}")
            return Response(
                {"detail": "Неверный токен Google", "error_code": "INVALID_GOOGLE_TOKEN"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Google login failed: {str(e)}")
            return Response(
                {"detail": "Ошибка входа через Google. Попробуйте позже.", "error_code": "GOOGLE_LOGIN_ERROR"},
                status=status.HTTP_400_BAD_REQUEST,
            )


from .tinkoff import get_client


class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user).order_by(
            "-is_default", "-created_at"
        )

    def perform_create(self, serializer):
        # If this is the first method, make it default
        is_default = False
        if not PaymentMethod.objects.filter(user=self.request.user).exists():
            is_default = True

        serializer.save(user=self.request.user, is_default=is_default)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        method = self.get_object()
        PaymentMethod.objects.filter(user=request.user).update(is_default=False)
        method.is_default = True
        method.save()
        return Response({"detail": "Set as default"})

    @action(detail=False, methods=["post"])
    def get_sbp_link(self, request):
        """
        Get SBP QR Code link for a dummy payment (or actual binding).
        """
        client = get_client()

        # 1. Init Payment (e.g. 10 RUB for test/binding)
        # Using a random OrderId for now
        import uuid

        order_id = str(uuid.uuid4())
        amount = 1000  # 10.00 RUB

        init_response = client.init_payment(
            order_id, amount, description="Привязка СБП"
        )

        if not init_response.get("Success"):
            return Response(
                {"detail": init_response.get("Message", "Payment Init Failed")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_id = init_response["PaymentId"]

        # 2. Get QR
        qr_response = client.get_qr(payment_id)

        if not qr_response.get("Success"):
            return Response(
                {"detail": qr_response.get("Message", "GetQR Failed")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "payment_id": payment_id,
                "qr_payload": qr_response.get("Data"),  # The link to be put in QR
                "order_id": order_id,
            }
        )


class UserDeviceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserDeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure current device is tracked when listing
        track_device(self.request.user, self.request)
        qs = UserDevice.objects.filter(user=self.request.user).order_by("-last_active")
        return qs

    @action(detail=True, methods=["post"])
    def logout(self, request, pk=None):
        # Logic to invalidate token would go here
        # For now just delete the device record
        device = self.get_object()
        device.delete()
        return Response({"detail": "Device logged out"})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"detail": "Marked as read"})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True
        )
        return Response({"detail": "All marked as read"})


class HelpArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HelpArticle.objects.filter(is_published=True)
    serializer_class = HelpArticleSerializer
    permission_classes = [AllowAny]
    search_fields = ["question", "answer", "category"]
    filter_backends = [SearchFilter, OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "order", "question"]
    ordering = ["order", "question"]


class FavoriteDishViewSet(viewsets.ModelViewSet):
    queryset = FavoriteDish.objects.all()
    serializer_class = FavoriteDishSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return FavoriteDish.objects.filter(user=user)

    @action(detail=False, methods=["get"])
    def list_favorites(self, request):
        """Get all favorite dishes for the current user."""
        favorites = self.get_queryset()
        dishes = [fav.dish for fav in favorites]
        serializer = DishSerializer(dishes, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["delete"])
    def remove_favorite(self, request, pk=None):
        """Remove a dish from favorites."""
        favorite = self.get_object()
        favorite.delete()
        return Response({"status": "removed", "message": "Removed from favorites"})

    @action(detail=False, methods=["post"])
    def add_favorite(self, request):
        """Add a dish to favorites."""
        dish_id = request.data.get("dish_id")
        if not dish_id:
            return Response(
                {"error": "dish_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return Response(
                {"error": "Dish not found"}, status=status.HTTP_404_NOT_FOUND
            )

        favorite, created = FavoriteDish.objects.get_or_create(
            user=request.user, dish=dish
        )

        if created:
            return Response({"status": "added", "message": "Added to favorites"})
        else:
            return Response(
                {"status": "already_exists", "message": "Already in favorites"}
            )


class HelpArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HelpArticle.objects.filter(is_published=True)
    serializer_class = HelpArticleSerializer
    permission_classes = [AllowAny]
    search_fields = ["question", "answer", "category"]
    filter_backends = [SearchFilter]


class BecomeSellerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if _safe_has_producer(request.user):
            return Response(
                {"detail": "You are already a seller"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create producer profile
        data = request.data
        name = data.get("name", f"{request.user.first_name}'s Kitchen")
        city = data.get("city", "Unknown")

        moderation = moderate_shop_name(str(name or ""))
        if not moderation.get("approved"):
            return Response(
                {"detail": "Название магазина не прошло модерацию"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        producer = Producer.objects.create(
            user=request.user,
            name=name,
            city=city,
            producer_type=data.get("producer_type", "SELF_EMPLOYED"),
        )

        return Response(
            ProducerSerializer(producer).data, status=status.HTTP_201_CREATED
        )


class ProfileChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangeRequestSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            change_type = serializer.validated_data["change_type"]
            new_value = serializer.validated_data["new_value"]
            user = request.user

            if change_type == "PASSWORD":
                user.set_password(new_value)
                user.save()
                return Response({"detail": "Пароль успешно изменен"})

            # Generate code
            code = str(random.randint(100000, 999999))

            # Create/Update PendingChange
            PendingChange.objects.filter(user=user, change_type=change_type).delete()
            PendingChange.objects.create(
                user=user,
                change_type=change_type,
                new_value=new_value,
                verification_code=code,
            )

            # Send Email
            try:
                # Reuse template or simple text
                send_mail(
                    "Код подтверждения изменений",
                    f"Ваш код подтверждения для изменения {change_type}: {code}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                # For development, we might not have email configured, so just log it
                print(f"Error sending email: {e}")
                # return Response({'detail': 'Ошибка отправки email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({"detail": "Код отправлен на ваш email"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileChangeConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangeConfirmSerializer(data=request.data)
        if serializer.is_valid():
            change_type = serializer.validated_data["change_type"]
            code = serializer.validated_data["verification_code"]
            user = request.user

            try:
                pending_change = PendingChange.objects.get(
                    user=user, change_type=change_type
                )
            except PendingChange.DoesNotExist:
                return Response(
                    {"detail": "Запрос на изменение не найден"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not pending_change.is_valid():
                return Response(
                    {"detail": "Код истек"}, status=status.HTTP_400_BAD_REQUEST
                )

            if pending_change.verification_code != code:
                return Response(
                    {"detail": "Неверный код"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Apply changes
            try:
                with transaction.atomic():
                    if change_type == "EMAIL":
                        user.email = pending_change.new_value
                        user.username = (
                            pending_change.new_value
                        )  # Keeping username=email
                        user.save()
                    elif change_type == "PHONE":
                        profile, _ = Profile.objects.get_or_create(user=user)
                        profile.phone = pending_change.new_value
                        profile.save()
                    elif change_type == "PASSWORD":
                        user.set_password(pending_change.new_value)
                        user.save()

                    pending_change.delete()

                    return Response({"detail": "Данные успешно обновлены"})
            except Exception as e:
                return Response(
                    {"detail": f"Ошибка обновления: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
  
"""
Новые ViewSet и View для черновиков заказов и повторного заказа.
Этот файл будет объединен с views.py.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone

from .models import OrderDraft, Order, SearchHistory, SavedSearch
from .serializers import (
    OrderDraftSerializer,
    ReorderSerializer,
    SearchHistorySerializer,
    SavedSearchSerializer,
)
from .services.order_service import OrderService
from core.responses import APIResponse


class OrderDraftViewSet(viewsets.ModelViewSet):
    """ViewSet для черновиков заказов."""

    serializer_class = OrderDraftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrderDraft.objects.filter(user=self.request.user).select_related("dish")

    def perform_create(self, serializer):
        """Сохраняет черновик заказа."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Обновляет черновик заказа."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def save_draft(self, request):
        """
        Сохраняет черновик заказа из переданных данных.

        Обоснование: Устраняет проблему потери данных при заполнении формы заказа.
        Пользователь может вернуться к оформлению позже и продолжить с того же места.
        """
        serializer = OrderDraftSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return APIResponse.success(
                data=serializer.data,
                message="Черновик заказа сохранен",
                status_code=status.HTTP_201_CREATED,
            )
        return APIResponse.validation_error(serializer.errors)

    @action(detail=False, methods=["get"])
    def my_drafts(self, request):
        """
        Получает черновики заказов текущего пользователя.

        Обоснование: Позволяет пользователю видеть все свои черновики
        и продолжить оформление заказа с любого из них.
        """
        drafts = OrderService.get_user_drafts(request.user)
        serializer = OrderDraftSerializer(drafts, many=True)
        return APIResponse.success(data=serializer.data)

    @action(detail=True, methods=["delete"])
    def delete_draft(self, request, pk=None):
        """
        Удаляет черновик заказа.

        Обоснование: Позволяет пользователю удалять ненужные черновики.
        """
        deleted = OrderService.delete_draft(request.user, pk)
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return APIResponse.error(
            message="Черновик не найден",
            error_code="DRAFT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class SearchHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для истории поиска."""

    serializer_class = SearchHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SearchHistory.objects.filter(
            user=self.request.user
        ).order_by("-created_at")


class SavedSearchViewSet(viewsets.ModelViewSet):
    """ViewSet для сохраненных поисковых запросов."""

    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedSearch.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReorderView(APIView):
    """View для повторного заказа."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Создает новый заказ на основе существующего.

        Обоснование: Устраняет проблему необходимости повторно заполнять форму заказа
        для часто заказываемых блюд. Пользователь может быстро повторить заказ
        с теми же или измененными параметрами.
        """
        serializer = ReorderSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            try:
                new_order = OrderService.reorder_from_existing(
                    user=request.user,
                    order_id=serializer.validated_data["order_id"],
                    quantity=serializer.validated_data.get("quantity", 1),
                    delivery_type=serializer.validated_data.get("delivery_type", "BUILDING"),
                    delivery_address_text=serializer.validated_data.get("delivery_address_text", ""),
                    apartment=serializer.validated_data.get("apartment", ""),
                    entrance=serializer.validated_data.get("entrance", ""),
                    floor=serializer.validated_data.get("floor", ""),
                    intercom=serializer.validated_data.get("intercom", ""),
                    delivery_latitude=serializer.validated_data.get("delivery_latitude"),
                    delivery_longitude=serializer.validated_data.get("delivery_longitude"),
                    delivery_price=serializer.validated_data.get("delivery_price"),
                    selected_toppings=serializer.validated_data.get("selected_toppings"),
                    is_gift=serializer.validated_data.get("is_gift", False),
                    is_anonymous=serializer.validated_data.get("is_anonymous", False),
                    recipient_phone=serializer.validated_data.get("recipient_phone", ""),
                    recipient_name=serializer.validated_data.get("recipient_name", ""),
                    recipient_address_text=serializer.validated_data.get("recipient_address_text", ""),
                    recipient_latitude=serializer.validated_data.get("recipient_latitude"),
                    recipient_longitude=serializer.validated_data.get("recipient_longitude"),
                    recipient_specified_time=serializer.validated_data.get("recipient_specified_time"),
                )
                return APIResponse.success(
                    data={
                        "order_id": str(new_order.id),
                        "message": "Заказ успешно создан",
                    },
                    message="Повторный заказ успешно оформлен",
                    status_code=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return APIResponse.error(
                    message=str(e),
                    error_code="REORDER_ERROR",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
        return APIResponse.validation_error(serializer.errors)
