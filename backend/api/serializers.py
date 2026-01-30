from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Address,
    Cart,
    CartItem,
    Category,
    ChatComplaint,
    # Payout,  # Not used in this file
    ChatMessage,
    Dish,
    DishImage,
    DishTopping,
    Dispute,
    FavoriteDish,
    HelpArticle,
    Notification,
    Order,
    OrderDraft,
    PaymentMethod,
    Producer,
    Profile,
    PromoCode,
    Review,
    SavedSearch,
    SearchHistory,
    UserDevice,
)


class DishToppingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishTopping
        fields = ["id", "name", "price"]


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = "__all__"
        read_only_fields = ["user", "created_at"]


class UserDeviceSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserDevice
        fields = "__all__"
        read_only_fields = ["user", "last_active", "ip_address", "user_agent"]

    def get_is_current(self, obj):
        request = self.context.get("request")
        if not request:
            return False

        user_agent = request.META.get("HTTP_USER_AGENT", "")
        # Simple check: if UA matches. IP check is harder with proxies but we can try.
        # Ideally, we should check if this specific device record was just
        # updated by this request?
        # But list view doesn't update.
        # So we compare stored UA with request UA.
        return obj.user_agent == user_agent


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user", "created_at", "title", "message", "type", "link"]


class HelpArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpArticle
        fields = "__all__"


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    finished_photo = serializers.SerializerMethodField()
    dish_photo = serializers.SerializerMethodField()
    dish_additional_photos = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = [
            "user",
            "order",
            "producer",
            "created_at",
            "updated_at",
            "is_updated",
            "refund_accepted",
            "photo",
        ]

    def get_user(self, obj):
        full_name = (obj.user.get_full_name() or "").strip()
        if full_name:
            return full_name
        return obj.user.email

    def get_finished_photo(self, obj):
        order = getattr(obj, "order", None)
        if not order or not order.finished_photo:
            return None
        # Return URL if it's a file field
        if hasattr(order.finished_photo, "url"):
            return order.finished_photo.url
        return str(order.finished_photo)

    def get_dish_photo(self, obj):
        order = getattr(obj, "order", None)
        if not order or not order.dish or not order.dish.photo:
            return None
        if hasattr(order.dish.photo, "url"):
            return order.dish.photo.url
        return str(order.dish.photo)

    def get_dish_additional_photos(self, obj):
        order = getattr(obj, "order", None)
        if not order or not order.dish:
            return []
        return [
            img.image.url if hasattr(img.image, "url") else str(img.image)
            for img in order.dish.images.all()
        ]


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = "__all__"
        read_only_fields = ["producer", "created_at", "is_used"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")

    class Meta:
        model = ChatMessage
        fields = "__all__"
        read_only_fields = ["sender", "created_at", "is_read"]


class ChatComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatComplaint
        fields = "__all__"
        read_only_fields = ["reporter", "created_at", "resolved"]


class ProducerSerializer(serializers.ModelSerializer):
    total_commission_rate = serializers.ReadOnlyField()

    class Meta:
        model = Producer
        fields = "__all__"
        read_only_fields = [
            "rating",
            "rating_count",
            "penalty_points",
            "consecutive_rejections",
            "is_banned",
            "balance",
            "created_at",
        ]


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "parent", "subcategories"]

    def get_subcategories(self, obj):
        import logging
        logger = logging.getLogger(__name__)
        
        # Use prefetched subcategories to avoid N+1 queries
        # The subcategories should be prefetched in viewset with prefetch_related('subcategories')
        if hasattr(obj, '_prefetched_objects_cache') and 'subcategories' in obj._prefetched_objects_cache:
            subcategories = obj._prefetched_objects_cache['subcategories']
            logger.warning(
                f"[CategorySerializer] Using prefetched subcategories for category {obj.id} ({obj.name}), "
                f"count: {len(subcategories)}"
            )
            return CategorySerializer(subcategories, many=True).data
        
        # Fallback to query if not prefetched
        if obj.subcategories.exists():
            logger.warning(
                f"[CategorySerializer] WARNING: Not prefetched! Querying subcategories for category {obj.id} ({obj.name}), "
                f"count: {obj.subcategories.count()}"
            )
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []


class DishImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishImage
        fields = ["id", "image", "is_primary", "sort_order"]


class DishSerializer(serializers.ModelSerializer):
    images = DishImageSerializer(many=True, read_only=True)
    toppings = DishToppingSerializer(many=True, required=False)
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Dish
        fields = [
            "id",
            "name",
            "description",
            "price",
            "category",
            "producer",
            "photo",
            "is_available",
            "is_top",
            "weight",
            "composition",
            "manufacturing_time",
            "shelf_life",
            "storage_conditions",
            "dimensions",
            "fillings",
            "is_archived",
            "sales_count",
            "max_quantity_per_order",
            "start_sales_at",
            "allow_preorder",
            "images",
            "toppings",
            "cooking_time_minutes",
            "calories",
            "proteins",
            "fats",
            "carbs",
            "views_count",
            "in_cart_count",
            "min_quantity",
            "discount_percentage",
            "rating",
            "rating_count",
            "sort_score",
            "is_favorite",
        ]
        read_only_fields = [
            "views_count",
            "in_cart_count",
            "sales_count",
            "rating",
            "rating_count",
            "sort_score",
        ]

    def get_is_favorite(self, obj):
        import logging
        logger = logging.getLogger(__name__)
        
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            # Use prefetched favorite_dishes to avoid N+1 query
            # The favorite_dishes are prefetched in get_queryset with prefetch_related('favorite_dishes')
            user_id = request.user.id
            for favorite in obj.favorite_dishes.all():
                if favorite.user_id == user_id:
                    return True
            return False
        return False

    def create(self, validated_data):
        toppings_data = validated_data.pop("toppings", [])
        dish = super().create(validated_data)
        self._save_toppings(dish, toppings_data)
        return dish

    def update(self, instance, validated_data):
        toppings_data = validated_data.pop("toppings", None)
        dish = super().update(instance, validated_data)
        if toppings_data is not None:
            instance.toppings.all().delete()
            self._save_toppings(instance, toppings_data)
        return dish

    def _save_toppings(self, dish, toppings_data):
        for item in toppings_data or []:
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            raw_price = item.get("price", 0)
            try:
                price_val = float(str(raw_price).replace(",", "."))
            except (TypeError, ValueError):
                price_val = 0
            DishTopping.objects.create(dish=dish, name=name, price=price_val)

    def validate(self, data):
        """
        При создании нового товара достаточно загрузить минимум 1 фото.
        Дополнительные фото могут быть загружены отдельными запросами.
        """
        # При создании нового товара достаточно загрузить минимум 1 фото
        if self.instance is None:  # Создание нового товара
            request = self.context.get('request')
            if request and hasattr(request, 'FILES') and request.FILES:
                images_count = len([k for k in request.FILES.keys() if k.startswith('image')])
                if images_count < 1:
                    raise serializers.ValidationError("Необходимо загрузить минимум 1 фотографию товара")
        return data


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = "__all__"
        read_only_fields = ["status", "resolution_notes", "compensation_amount"]


class OrderSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    acceptance_deadline = serializers.DateTimeField(read_only=True)
    disputes = DisputeSerializer(many=True, read_only=True)
    review = ReviewSerializer(read_only=True)
    tips_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    status_display = serializers.SerializerMethodField()
    status_step = serializers.SerializerMethodField()
    status_max_step = serializers.SerializerMethodField()

    # New inputs
    promo_code_text = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    scheduled_delivery_time = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="Requested delivery time. Leave empty for ASAP delivery."
    )

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Use a simple representation for dish to avoid recursion or
        # excessive data if needed,
        # but here we want the full dish object for the orders modal.
        ret["dish"] = DishSerializer(instance.dish, context=self.context).data
        return ret

    def get_status_display(self, obj):
        base = obj.get_status_display()
        if obj.status == "CANCELLED" and getattr(obj, "cancelled_by", None):
            mapping = {
                "BUYER": "Отменён покупателем",
                "SELLER": "Отменён продавцом",
                "ADMIN": "Отменён администратором",
                "SYSTEM": "Отменён системой",
            }
            return mapping.get(obj.cancelled_by, base)
        return base

    def get_status_step(self, obj):
        mapping = {
            "WAITING_FOR_PAYMENT": 1,
            "WAITING_FOR_RECIPIENT": 2,
            "WAITING_FOR_ACCEPTANCE": 2,
            "COOKING": 3,
            "READY_FOR_REVIEW": 4,
            "READY_FOR_DELIVERY": 4,
            "DELIVERING": 5,
            "ARRIVED": 6,
            "COMPLETED": 7,
        }
        return mapping.get(obj.status, 0)

    def get_status_max_step(self, obj):
        return 7

    def create(self, validated_data):
        validated_data.pop("promo_code_text", None)
        import uuid

        from django.utils import timezone

        is_gift = validated_data.get("is_gift") or False
        if is_gift and not validated_data.get("recipient_token"):
            validated_data["recipient_token"] = uuid.uuid4().hex
            validated_data["recipient_token_expires_at"] = (
                timezone.now() + timezone.timedelta(days=7)
            )
        return super().create(validated_data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        is_gift = attrs.get("is_gift") or False
        if is_gift:
            recipient_phone = (attrs.get("recipient_phone") or "").strip()
            if not recipient_phone:
                raise serializers.ValidationError(
                    {
                        "recipient_phone": "Для подарочного заказа нужно указать номер "
                        "телефона получателя."
                    }
                )
        return attrs

    class Meta:
        model = Order
        fields = [
            "id",
            "user_name",
            "phone",
            "dish",
            "quantity",
            "total_price",
            "created_at",
            "delivery_latitude",
            "delivery_longitude",
            "delivery_address_text",
            "status",
            "status_display",
            "status_step",
            "status_max_step",
            "is_urgent",
            "acceptance_deadline",
            "estimated_cooking_time",
            "finished_photo",
            "disputes",
            "review",
            "tips_amount",
            "selected_toppings",
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
            "delivery_type",
            "delivery_price",
            "applied_promo_code",
            "discount_amount",
            "promo_code_text",
            "apartment",
            "entrance",
            "floor",
            "intercom",
            "delivery_comment",
            "scheduled_delivery_time",
        ]
        read_only_fields = [
            "total_price",
            "estimated_cooking_time",
            "finished_photo",
            "tips_amount",
            "reschedule_requested_by_seller",
            "reschedule_new_time",
            "reschedule_approved_by_buyer",
            "recipient_specified_time",
            "gift_proof_image",
            "recipient_address_text",
            "recipient_latitude",
            "recipient_longitude",
            "delivery_price",
            "applied_promo_code",
            "discount_amount",
        ]


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        User = get_user_model()
        email = validated_data.get("email")
        password = validated_data.get("password")
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )
        return user


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = get_user_model()
        fields = ["username", "email", "password", "first_name"]
        extra_kwargs = {
            'first_name': {'required': True},
        }
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Пароль должен содержать минимум 8 символов")
        return value
    
    def create(self, validated_data):
        User = get_user_model()
        email = validated_data.get("email")
        password = validated_data.get("password")
        first_name = validated_data.get("first_name", "")
        
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name
        )
        return user


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField(source="user.email")
    first_name = serializers.ReadOnlyField(source="user.first_name")
    last_name = serializers.ReadOnlyField(source="user.last_name")
    shop_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    producer_id = serializers.SerializerMethodField()
    is_hidden = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    opening_time = serializers.SerializerMethodField()
    closing_time = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    short_description = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    main_category = serializers.SerializerMethodField()
    weekly_schedule = serializers.SerializerMethodField()
    delivery_radius_km = serializers.SerializerMethodField()
    delivery_price_to_building = serializers.SerializerMethodField()
    delivery_price_to_door = serializers.SerializerMethodField()
    delivery_time_minutes = serializers.SerializerMethodField()
    delivery_pricing_rules = serializers.SerializerMethodField()
    delivery_zones = serializers.SerializerMethodField()
    pickup_enabled = serializers.SerializerMethodField()
    requisites = serializers.SerializerMethodField()
    employees = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    max_orders_per_slot = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "shop_name",
            "phone",
            "is_2fa_enabled",
            "auth_provider",
            "disputes_lost",
            "role",
            "producer_id",
            "is_hidden",
            "city",
            "address",
            "opening_time",
            "closing_time",
            "latitude",
            "longitude",
            "short_description",
            "description",
            "logo_url",
            "main_category",
            "weekly_schedule",
            "delivery_radius_km",
            "delivery_price_to_building",
            "delivery_price_to_door",
            "delivery_time_minutes",
            "delivery_pricing_rules",
            "delivery_zones",
            "pickup_enabled",
            "requisites",
            "employees",
            "documents",
            "max_orders_per_slot",
        ]

    def get_role(self, obj):
        # Try to get role from current session (JWT token)
        request = self.context.get("request")
        if request and hasattr(request, "auth") and request.auth:
            try:
                # SimpleJWT token object supports get
                return request.auth.get("role", "CLIENT")
            except AttributeError:
                pass

        # Fallback for non-token access or missing claim
        if hasattr(obj.user, "producer"):
            return "SELLER"
        return "CLIENT"

    def get_shop_name(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.name
        return None

    def get_producer_id(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.id
        return None

    def get_is_hidden(self, obj):
        if hasattr(obj.user, "producer"):
            return bool(obj.user.producer.is_hidden)
        return None

    def get_city(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.city
        return None

    def get_address(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.address
        return None

    def get_opening_time(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.opening_time
        return None

    def get_closing_time(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.closing_time
        return None

    def get_latitude(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.latitude
        return None

    def get_longitude(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.longitude
        return None

    def get_short_description(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.short_description
        return None

    def get_description(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.description
        return None

    def get_logo_url(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.logo_url
        return None

    def get_main_category(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.main_category_id
        return None

    def get_weekly_schedule(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.weekly_schedule
        return None

    def get_delivery_radius_km(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_radius_km
        return None

    def get_delivery_price_to_building(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_price_to_building
        return None

    def get_delivery_price_to_door(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_price_to_door
        return None

    def get_delivery_time_minutes(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_time_minutes
        return None

    def get_delivery_pricing_rules(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_pricing_rules
        return None

    def get_delivery_zones(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.delivery_zones
        return None

    def get_pickup_enabled(self, obj):
        if hasattr(obj.user, "producer"):
            return bool(obj.user.producer.pickup_enabled)
        return None

    def get_requisites(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.requisites
        return None

    def get_employees(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.employees
        return None

    def get_documents(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.documents
        return None

    def get_max_orders_per_slot(self, obj):
        if hasattr(obj.user, "producer"):
            return obj.user.producer.max_orders_per_slot
        return None


class FavoriteDishSerializer(serializers.ModelSerializer):
    dish = DishSerializer(read_only=True)

    class Meta:
        model = FavoriteDish
        fields = ["id", "dish", "created_at"]
        read_only_fields = ["id", "created_at", "user"]


class ChangeRequestSerializer(serializers.Serializer):
    change_type = serializers.ChoiceField(
        choices=[("EMAIL", "Email"), ("PHONE", "Phone"), ("PASSWORD", "Password")]
    )
    new_value = serializers.CharField(max_length=255)
    # Optional fields for password change
    old_password = serializers.CharField(required=False, allow_blank=True)
    confirm_password = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        change_type = data["change_type"]
        new_value = data["new_value"]

        profile = None
        request = self.context.get("request")
        if request and hasattr(request.user, "profile"):
            profile = request.user.profile

        if (
            profile
            and profile.auth_provider == "GOOGLE"
            and change_type in ("EMAIL", "PHONE")
        ):
            raise serializers.ValidationError(
                "Для Google аккаунта изменение email и телефона недоступно."
            )

        if change_type == "EMAIL":
            from django.core.exceptions import ValidationError
            from django.core.validators import validate_email

            try:
                validate_email(new_value)
            except ValidationError:
                raise serializers.ValidationError("Некорректный формат email.")

            User = get_user_model()
            if User.objects.filter(email__iexact=new_value).exists():
                raise serializers.ValidationError("Email уже используется.")

        elif change_type == "PASSWORD":
            if len(new_value) < 6:
                raise serializers.ValidationError(
                    "Пароль слишком короткий (минимум 6 символов)."
                )

            old_password = data.get("old_password")
            confirm_password = data.get("confirm_password")

            if not old_password:
                raise serializers.ValidationError("Необходимо ввести старый пароль.")
            if not confirm_password:
                raise serializers.ValidationError(
                    "Необходимо подтвердить новый пароль."
                )

            if new_value != confirm_password:
                raise serializers.ValidationError("Пароли не совпадают.")

            # Verify old password
            user = self.context.get("request").user
            if not user.check_password(old_password):
                raise serializers.ValidationError("Старый пароль неверен.")

        return data


class ChangeConfirmSerializer(serializers.Serializer):
    change_type = serializers.ChoiceField(
        choices=[("EMAIL", "Email"), ("PHONE", "Phone"), ("PASSWORD", "Password")]
    )
    verification_code = serializers.CharField(max_length=6)


class AddressSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Address
        fields = [
            "id",
            "user",
            "city",
            "street",
            "house",
            "apartment",
            "latitude",
            "longitude",
        ]


class CartItemSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["dish"] = DishSerializer(instance.dish, context=self.context).data
        return ret

    class Meta:
        model = CartItem
        fields = ["id", "dish", "quantity", "price_at_the_moment", "selected_toppings"]


class CartSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_cooking_time = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "user", "items", "total_cooking_time"]

    def get_total_cooking_time(self, obj):
        # This field is calculated in the view, so we return 0 as default
        # The actual value will be set in the view
        return getattr(obj, "total_cooking_time", 0)


class SearchHistorySerializer(serializers.ModelSerializer):
    """Сериализатор для истории поиска."""

    class Meta:
        model = SearchHistory
        fields = ["id", "query", "results_count", "created_at"]
        read_only_fields = ["id", "created_at", "results_count"]


class SavedSearchSerializer(serializers.ModelSerializer):
    """Сериализатор для сохраненных поисковых запросов."""

    class Meta:
        model = SavedSearch
        fields = ["id", "name", "query_params", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrderDraftSerializer(serializers.ModelSerializer):
    """Сериализатор для черновиков заказов."""

    dish = DishSerializer(read_only=True)

    class Meta:
        model = OrderDraft
        fields = [
            "id",
            "user",
            "dish",
            "quantity",
            "delivery_type",
            "delivery_address_text",
            "apartment",
            "entrance",
            "floor",
            "intercom",
            "delivery_latitude",
            "delivery_longitude",
            "delivery_price",
            "selected_toppings",
            "is_gift",
            "is_anonymous",
            "recipient_phone",
            "recipient_name",
            "recipient_address_text",
            "recipient_latitude",
            "recipient_longitude",
            "recipient_specified_time",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "updated_at"]


class ReorderSerializer(serializers.Serializer):
    """Сериализатор для повторного заказа."""

    order_id = serializers.UUIDField()
    quantity = serializers.IntegerField(default=1, min_value=1)
    delivery_type = serializers.ChoiceField(
        choices=["BUILDING", "DOOR"],
        default="BUILDING",
        required=False,
    )
    delivery_address_text = serializers.CharField(required=False, allow_blank=True)
    apartment = serializers.CharField(required=False, allow_blank=True)
    entrance = serializers.CharField(required=False, allow_blank=True)
    floor = serializers.CharField(required=False, allow_blank=True)
    intercom = serializers.CharField(required=False, allow_blank=True)
    delivery_latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    delivery_longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    selected_toppings = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    is_gift = serializers.BooleanField(default=False, required=False)
    is_anonymous = serializers.BooleanField(default=False, required=False)
    recipient_phone = serializers.CharField(required=False, allow_blank=True)
    recipient_name = serializers.CharField(required=False, allow_blank=True)
    recipient_address_text = serializers.CharField(required=False, allow_blank=True)
    recipient_latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    recipient_longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    recipient_specified_time = serializers.DateTimeField(required=False, allow_null=True)

    def validate_order_id(self, value):
        """Проверяем, что заказ существует и принадлежит пользователю."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        try:
            order = Order.objects.get(id=value, user=request.user)
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found")

        # Проверяем, что заказ можно повторить
        if order.status not in ["COMPLETED", "CANCELLED"]:
            raise serializers.ValidationError(
                "Only completed or cancelled orders can be reordered"
            )

        return value
