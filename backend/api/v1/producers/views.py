"""Producers API v1 views."""
import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from dateutil.relativedelta import relativedelta

from api.models import Order, Producer, Profile
from api.services.dispute_service import DisputeService
from api.services.penalty_service import PenaltyService
from api.services.repeat_purchase_service import RepeatPurchaseService

from .serializers import ProducerSerializer

logger = logging.getLogger(__name__)


class ProducerViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с магазинами."""

    serializer_class = ProducerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает список магазинов для текущего пользователя."""
        user = self.request.user

        # Если пользователь - продавец, возвращаем только свой магазин
        if hasattr(user, "producer"):
            return Producer.objects.filter(id=user.producer.id)

        # Иначе возвращаем все магазины
        return Producer.objects.all()

    @action(detail=True, methods=['get'])
    def repeat_customers(self, request, pk=None):
        """
        Список повторных покупателей.
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут просматривать своих повторных покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете просматривать только своих покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем список повторных покупателей
        repeat_purchase_service = RepeatPurchaseService()
        customers = repeat_purchase_service.get_repeat_customers(producer)

        return Response(
            {
                "success": True,
                "customers": customers,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'])
    def problem_buyers(self, request, pk=None):
        """
        Список проблемных покупателей.
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут просматривать список проблемных покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете просматривать только своих покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        dispute_service = DisputeService()

        # Получаем список проблемных покупателей (те, кто заблокирован этим магазином)
        problem_buyers = []
        for customer in Profile.objects.filter(is_problem_buyer=True):
            if dispute_service.can_producer_refuse_buyer(producer, customer.user):
                problem_buyers.append({
                    "user_id": str(customer.user.id),
                    "name": f"{customer.user.first_name or ''} {customer.user.last_name or ''}".strip(),
                    "email": customer.user.email or "",
                    "disputes_lost": customer.disputes_lost,
                    "unjustified_cancellations": customer.unjustified_cancellations,
                    "problem_buyer_reason": customer.problem_buyer_reason,
                })

        return Response(
            {
                "success": True,
                "problem_buyers": problem_buyers,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def block_buyer(self, request, pk=None):
        """
        Заблокировать покупателя.
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут блокировать покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете блокировать только покупателей своих заказов"},
                status=status.HTTP_403_FORBIDDEN
            )

        buyer_id = request.data.get("buyer_id")
        if not buyer_id:
            return Response(
                {"error": "Необходимо указать buyer_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            buyer = User.objects.get(id=buyer_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Покупатель не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем или создаем профиль покупателя
        profile, _ = Profile.objects.get_or_create(user=buyer)

        # Добавляем магазин в список заблокированных
        blocked_list = profile.blocked_by_producers if isinstance(profile.blocked_by_producers, list) else []
        if str(producer.id) not in blocked_list:
            blocked_list.append(str(producer.id))
            profile.blocked_by_producers = blocked_list
            profile.save(update_fields=["blocked_by_producers"])

        return Response(
            {
                "success": True,
                "message": "Покупатель заблокирован",
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def unblock_buyer(self, request, pk=None):
        """
        Разблокировать покупателя.
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут разблокировать покупателей"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете разблокировать только покупателей своих заказов"},
                status=status.HTTP_403_FORBIDDEN
            )

        buyer_id = request.data.get("buyer_id")
        if not buyer_id:
            return Response(
                {"error": "Необходимо указать buyer_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            buyer = User.objects.get(id=buyer_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Покупатель не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем профиль покупателя
        try:
            profile = Profile.objects.get(user=buyer)
        except Profile.DoesNotExist:
            return Response(
                {"error": "Профиль покупателя не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Удаляем магазин из списка заблокированных
        blocked_list = profile.blocked_by_producers if isinstance(profile.blocked_by_producers, list) else []
        if str(producer.id) in blocked_list:
            blocked_list.remove(str(producer.id))
            profile.blocked_by_producers = blocked_list
            profile.save(update_fields=["blocked_by_producers"])

        return Response(
            {
                "success": True,
                "message": "Покупатель разблокирован",
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'])
    def penalty_info(self, request, pk=None):
        """
        Получить информацию о штрафах магазина.
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут просматривать информацию о штрафах"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете просматривать только информацию о своем магазине"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем заказы, за которые были штрафы
        rejected_orders = Order.objects.filter(
            producer=producer,
            cancelled_by="SELLER",
            penalty_amount__gt=0
        ).order_by("-cancelled_at")[:10]

        penalty_orders = []
        for order in rejected_orders:
            penalty_orders.append({
                "order_id": str(order.id),
                "penalty_amount": float(order.penalty_amount),
                "order_total": float(order.total_price),
                "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
                "penalty_reason": order.penalty_reason,
            })

        # Рассчитываем дату следующей доступной оплаты
        next_payment_date = None
        if producer.last_penalty_payment_date:
            next_payment_date = (
                producer.last_penalty_payment_date + relativedelta(months=1)
            ).isoformat()

        return Response(
            {
                "success": True,
                "penalty_points": producer.penalty_points,
                "consecutive_rejections": producer.consecutive_rejections,
                "is_banned": producer.is_banned,
                "ban_reason": producer.ban_reason if producer.is_banned else None,
                "balance": float(producer.balance),
                "last_penalty_payment_date": (
                    producer.last_penalty_payment_date.isoformat()
                    if producer.last_penalty_payment_date else None
                ),
                "next_payment_available_date": next_payment_date,
                "recent_penalties": penalty_orders,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def pay_penalty(self, request, pk=None):
        """
        Оплатить штраф (снять одно штрафное очко за 30% от стоимости заказа).
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"error": "Только продавцы могут оплачивать штрафы"},
                status=status.HTTP_403_FORBIDDEN
            )

        producer = user.producer

        # Проверяем, что это его магазин
        if str(producer.id) != pk:
            return Response(
                {"error": "Вы можете оплачивать только штрафы своего магазина"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем ID заказа
        order_id = request.data.get("order_id")
        if not order_id:
            return Response(
                {"error": "Необходимо указать order_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Находим заказ
        try:
            order = Order.objects.get(id=order_id, producer=producer)
        except Order.DoesNotExist:
            return Response(
                {"error": "Заказ не найден или не принадлежит вашему магазину"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем, что заказ был отклонен
        if order.cancelled_by != "SELLER":
            return Response(
                {"error": "Можно оплачивать штраф только за отклоненные заказы"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Оплачиваем штраф
        penalty_service = PenaltyService()
        try:
            penalty_service.pay_penalty_fine(producer, order)
            producer.refresh_from_db()

            next_available_date = None
            if producer.last_penalty_payment_date:
                next_available_date = (
                    producer.last_penalty_payment_date + relativedelta(months=1)
                ).isoformat()

            return Response(
                {
                    "success": True,
                    "message": "Штраф успешно оплачен",
                    "penalty_points_remaining": producer.penalty_points,
                    "balance_remaining": float(producer.balance),
                    "last_payment_date": (
                        producer.last_penalty_payment_date.isoformat()
                        if producer.last_penalty_payment_date else None
                    ),
                    "next_payment_available_date": next_available_date,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Failed to pay penalty for producer {producer.id}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='close_store')
    def close_store(self, request, pk=None):
        """
        POST /api/producers/{id}/close_store/

        Закрывает магазин на остаток дня.
        Доступно только владельцу и только в рабочие часы.
        """
        from django.utils import timezone
        from api.services.scheduling_service import SchedulingService

        producer = self.get_object()

        # Проверка прав доступа
        if request.user != producer.user:
            return Response(
                {"detail": "У вас нет прав для управления этим магазином."},
                status=status.HTTP_403_FORBIDDEN
            )

        scheduling_service = SchedulingService()
        now = timezone.now()

        # Проверка: магазин должен быть в рабочих часах
        if not scheduling_service.is_within_working_hours(producer, now):
            return Response(
                {
                    "detail": "Нельзя закрыть магазин вне рабочих часов.",
                    "next_open_at": scheduling_service.get_next_open_datetime(producer)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Закрываем магазин
        from django.conf import settings
        import pytz
        local_tz = pytz.timezone(settings.TIME_ZONE)

        producer.is_hidden = True
        producer.manual_closed_date = now.astimezone(local_tz).date()
        producer.save(update_fields=['is_hidden', 'manual_closed_date'])

        # Возвращаем статус
        is_open, closure_reason = scheduling_service.is_store_open_now(producer, now)

        return Response({
            "is_open": is_open,
            "closure_reason": closure_reason,
            "next_open_at": scheduling_service.get_next_open_datetime(producer)
        })

    @action(detail=True, methods=['post'], url_path='open_store')
    def open_store(self, request, pk=None):
        """
        POST /api/producers/{id}/open_store/

        Открывает магазин (отменяет ручное закрытие).
        Доступно только владельцу и только в рабочие часы.
        """
        from django.utils import timezone
        from api.services.scheduling_service import SchedulingService

        producer = self.get_object()

        # Проверка прав доступа
        if request.user != producer.user:
            return Response(
                {"detail": "У вас нет прав для управления этим магазином."},
                status=status.HTTP_403_FORBIDDEN
            )

        scheduling_service = SchedulingService()
        now = timezone.now()

        # КРИТИЧНО: нельзя открыть вне рабочих часов
        if not scheduling_service.is_within_working_hours(producer, now):
            working_hours = scheduling_service._get_working_hours_for_date(producer, now.date())

            return Response(
                {
                    "detail": "Нельзя открыть магазин вне рабочих часов. Измените расписание работы.",
                    "working_hours_today": {
                        "start": working_hours[0].strftime('%H:%M') if working_hours else None,
                        "end": working_hours[1].strftime('%H:%M') if working_hours else None
                    } if working_hours else None,
                    "next_open_at": scheduling_service.get_next_open_datetime(producer)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Открываем магазин (сбрасываем ручное закрытие)
        producer.is_hidden = False
        producer.manual_closed_date = None
        producer.save(update_fields=['is_hidden', 'manual_closed_date'])

        return Response({
            "is_open": True,
            "closure_reason": None,
            "next_open_at": None
        })

    @action(detail=True, methods=['get'], url_path='store_status', permission_classes=[AllowAny])
    def get_store_status(self, request, pk=None):
        """
        GET /api/producers/{id}/store_status/

        Публичный эндпоинт для получения статуса магазина.
        Доступен всем (включая неавторизованных покупателей).
        """
        from django.utils import timezone
        from api.services.scheduling_service import SchedulingService

        producer = self.get_object()
        scheduling_service = SchedulingService()
        now = timezone.now()

        is_within_hours = scheduling_service.is_within_working_hours(producer, now)
        is_open, closure_reason = scheduling_service.is_store_open_now(producer, now)

        working_hours = scheduling_service._get_working_hours_for_date(producer, now.date())

        return Response({
            "is_within_working_hours": is_within_hours,
            "is_store_open_now": is_open,
            "closure_reason": closure_reason,
            "next_open_at": scheduling_service.get_next_open_datetime(producer),
            "current_working_hours": {
                "start": working_hours[0].strftime('%H:%M'),
                "end": working_hours[1].strftime('%H:%M')
            } if working_hours else None
        })
