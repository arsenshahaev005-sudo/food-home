"""Producers API v1 views."""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Producer, Profile
from api.services.dispute_service import DisputeService
from api.services.repeat_purchase_service import RepeatPurchaseService

logger = logging.getLogger(__name__)


class ProducerViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с магазинами."""

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
