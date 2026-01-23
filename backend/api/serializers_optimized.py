"""
Оптимизированные сериализаторы с исправленными N+1 проблемами.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
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
    Address,
    Cart,
    CartItem,
    DishImage,
    Dispute,
    Payout,
    ChatMessage,
    ChatComplaint,
    PromoCode,
    Review,
    Profile,
    PaymentMethod,
    UserDevice,
    Notification,
    HelpArticle,
    DishTopping,
    GiftOrder,
    GiftProduct,
)
from .models_split import (
    OrderDelivery as OrderDeliveryModel,
    OrderFinance as OrderFinanceModel,
    OrderGift as OrderGiftModel,
    OrderReschedule as OrderRescheduleModel,
    OrderPromo as OrderPromoModel,
    OrderTimeline as OrderTimelineModel,
    OrderToppings as OrderToppingsModel,
)


class DishToppingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishTopping
        fields = ['id', 'name', 'price']


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class UserDeviceSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserDevice
        fields = '__all__'
        read_only_fields = ['user', 'last_active', 'ip_address', 'user_agent']

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request:
            return False
            
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        return obj.user_agent == user_agent


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'title', 'message', 'type', 'link']


class ProducerSerializer(serializers.ModelSerializer):
    total_commission_rate = serializers.ReadOnlyField()
    dishes_count = serializers.SerializerMethodField()

    class Meta:
        model = Producer
        fields = '__all__'
        read_only_fields = [
            'rating', 'rating_count', 'penalty_points', 
            'consecutive_rejections', 'is_banned', 'balance', 'created_at',
            'dishes_count'
        ]

    def get_dishes_count(self, obj):
        # Это поле будет предзагружено через prefetch_related
        return len(obj.dishes.all()) if hasattr(obj, 'dishes') else 0


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    dishes_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'subcategories', 'dishes_count']

    def get_subcategories(self, obj):
        if hasattr(obj, 'subcategories_prefetched'):
            return CategorySerializer(obj.subcategories_prefetched, many=True).data
        elif obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []

    def get_dishes_count(self, obj):
        # Это поле будет предзагружено через annotate
        return getattr(obj, 'dishes_count', 0)


class DishImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishImage
        fields = ['id', 'image']


class DishSerializer(serializers.ModelSerializer):
    images = DishImageSerializer(many=True, read_only=True)
    toppings = DishToppingSerializer(many=True, required=False)
    producer_info = ProducerSerializer(source='producer', read_only=True)
    category_info = CategorySerializer(source='category', read_only=True)
    
    class Meta:
        model = Dish
        fields = [
            'id', 'name', 'description', 'price', 'category', 'producer', 'photo', 'is_available',
            'is_top', 'weight', 'composition', 'manufacturing_time', 'shelf_life', 'storage_conditions',
            'dimensions', 'fillings', 'is_archived', 'sales_count', 'max_quantity_per_order',
            'start_sales_at', 'allow_preorder', 'images', 'toppings', 'cooking_time_minutes',
            'calories', 'proteins', 'fats', 'carbs',
            'views_count', 'in_cart_count', 'min_quantity', 'discount_percentage',
            'rating', 'rating_count', 'sort_score',
            'producer_info', 'category_info'
        ]
        read_only_fields = [
            'views_count', 'in_cart_count', 'sales_count', 
            'rating', 'rating_count', 'sort_score',
            'producer_info', 'category_info'
        ]

    def create(self, validated_data):
        toppings_data = validated_data.pop('toppings', [])
        dish = super().create(validated_data)
        self._save_toppings(dish, toppings_data)
        return dish

    def update(self, instance, validated_data):
        toppings_data = validated_data.pop('toppings', None)
        dish = super().update(instance, validated_data)
        if toppings_data is not None:
            instance.toppings.all().delete()
            self._save_toppings(instance, toppings_data)
        return dish

    def _save_toppings(self, dish, toppings_data):
        for item in toppings_data or []:
            name = str(item.get('name', '')).strip()
            if not name:
                continue
            raw_price = item.get('price', 0)
            try:
                price_val = float(str(raw_price).replace(',', '.'))
            except (TypeError, ValueError):
                price_val = 0
            DishTopping.objects.create(dish=dish, name=name, price=price_val)


class OrderDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderDeliveryModel
        fields = '__all__'


class OrderFinanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderFinanceModel
        fields = '__all__'


class OrderGiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderGiftModel
        fields = '__all__'


class OrderRescheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderRescheduleModel
        fields = '__all__'


class OrderPromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderPromoModel
        fields = '__all__'


class OrderTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTimelineModel
        fields = '__all__'


class OrderToppingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderToppingsModel
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    # Вложенные сериализаторы для связанных моделей
    delivery_info = OrderDeliverySerializer(read_only=True)
    finance_info = OrderFinanceSerializer(read_only=True)
    gift_info = OrderGiftSerializer(read_only=True)
    reschedule_info = OrderRescheduleSerializer(read_only=True)
    promo_info = OrderPromoSerializer(read_only=True)
    timeline_info = OrderTimelineSerializer(read_only=True)
    toppings_info = OrderToppingsSerializer(read_only=True)
    
    # Дополнительная информация
    dish_info = DishSerializer(source='dish', read_only=True)
    producer_info = ProducerSerializer(source='producer', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user_name', 'user', 'phone', 'dish', 'producer', 'quantity', 'total_price',
            'status', 'is_urgent', 'delivery_type', 'delivery_price', 'delivery_address_text',
            'apartment', 'entrance', 'floor', 'intercom', 'delivery_comment', 'applied_promo_code',
            'discount_amount', 'created_at', 'acceptance_deadline', 'accepted_at', 'ready_at',
            'delivered_at', 'cancelled_at', 'cancelled_by', 'cancelled_reason',
            'estimated_cooking_time', 'finished_photo', 'selected_toppings', 'tips_amount',
            'commission_rate_snapshot', 'commission_amount', 'producer_gross_amount',
            'producer_net_amount', 'refunded_total_amount', 'refunded_tips_amount',
            'refunded_commission_amount', 'payable_amount', 'payout_status',
            'payout_accrued_at', 'payout_paid_at', 'delivery_latitude', 'delivery_longitude',
            'reschedule_requested_by_seller', 'reschedule_new_time', 'reschedule_approved_by_buyer',
            'is_gift', 'is_anonymous', 'recipient_phone', 'recipient_name',
            'recipient_address_text', 'recipient_latitude', 'recipient_longitude',
            'recipient_specified_time', 'gift_proof_image', 'recipient_token',
            'recipient_token_expires_at', 'tinkoff_payment_id', 'current_payment',
            
            # Дополнительные поля через вложенные сериализаторы
            'delivery_info', 'finance_info', 'gift_info', 'reschedule_info',
            'promo_info', 'timeline_info', 'toppings_info',
            'dish_info', 'producer_info'
        ]
        read_only_fields = ['id', 'created_at', 'current_payment']

    def to_representation(self, instance):
        """
        Переопределяем метод для оптимизации выборки связанных данных.
        """
        data = super().to_representation(instance)
        
        # Добавляем предзагруженные связанные данные, если они существуют
        if hasattr(instance, 'delivery_info'):
            data['delivery_info'] = OrderDeliverySerializer(instance.delivery_info).data
        if hasattr(instance, 'finance_info'):
            data['finance_info'] = OrderFinanceSerializer(instance.finance_info).data
        if hasattr(instance, 'gift_info'):
            data['gift_info'] = OrderGiftSerializer(instance.gift_info).data
        if hasattr(instance, 'reschedule_info'):
            data['reschedule_info'] = OrderRescheduleSerializer(instance.reschedule_info).data
        if hasattr(instance, 'promo_info'):
            data['promo_info'] = OrderPromoSerializer(instance.promo_info).data
        if hasattr(instance, 'timeline_info'):
            data['timeline_info'] = OrderTimelineSerializer(instance.timeline_info).data
        if hasattr(instance, 'toppings_info'):
            data['toppings_info'] = OrderToppingsSerializer(instance.toppings_info).data
        if hasattr(instance, 'dish'):
            data['dish_info'] = DishSerializer(instance.dish).data
        if hasattr(instance, 'producer'):
            data['producer_info'] = ProducerSerializer(instance.producer).data
        
        return data


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    finished_photo = serializers.SerializerMethodField()
    dish_photo = serializers.SerializerMethodField()
    dish_additional_photos = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = [
            'user', 'order', 'producer', 'created_at', 'updated_at',
            'is_updated', 'refund_accepted', 'photo'
        ]

    def get_user(self, obj):
        full_name = (obj.user.get_full_name() or '').strip()
        if full_name:
            return full_name
        return obj.user.email

    def get_finished_photo(self, obj):
        # Используем предзагруженные данные, если они доступны
        order = getattr(obj, 'order', None)
        if not order:
            return None
            
        # Проверяем, есть ли предзагруженное поле
        if hasattr(order, 'finished_photo_url'):
            return order.finished_photo_url
        elif hasattr(order, 'finished_photo') and order.finished_photo:
            # Возвращаем URL если это файловое поле
            if hasattr(order.finished_photo, 'url'):
                return order.finished_photo.url
            return str(order.finished_photo)
        return None

    def get_dish_photo(self, obj):
        order = getattr(obj, 'order', None)
        if not order or not hasattr(order, 'dish'):
            return None
            
        dish = order.dish
        if hasattr(dish, 'photo_url'):
            return dish.photo_url
        elif dish.photo:
            if hasattr(dish.photo, 'url'):
                return dish.photo.url
            return str(dish.photo)
        return None

    def get_dish_additional_photos(self, obj):
        order = getattr(obj, 'order', None)
        if not order or not hasattr(order, 'dish'):
            return []
            
        dish = order.dish
        if hasattr(dish, 'images_prefetched'):
            return [img.image.url if hasattr(img.image, 'url') else str(img.image) 
                   for img in dish.images_prefetched]
        elif hasattr(dish, 'images'):
            return [img.image.url if hasattr(img.image, 'url') else str(img.image) 
                   for img in dish.images.all()]
        return []


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source='sender.email')
    
    class Meta:
        model = ChatMessage
        fields = '__all__'
        read_only_fields = ['sender', 'created_at', 'is_read']


class ChatComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatComplaint
        fields = '__all__'
        read_only_fields = ['reporter', 'created_at', 'resolved']


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = '__all__'
        read_only_fields = ['producer', 'created_at', 'is_used']


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = ['status', 'resolution_notes', 'compensation_amount']