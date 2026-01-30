"""Orders API v1 views."""

import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Order
from api.services.order_service import OrderService
from api.services.order_status import (
    InvalidOrderTransition,
    OrderActor,
    OrderStatusService,
    PermissionDeniedForTransition,
)
from api.v1.orders.serializers import (
    OrderAcceptSerializer,
    OrderCancelSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderRejectSerializer,
)

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с заказами."""

    queryset = Order.objects.all()
    permission_classes = [IsAuthenticated]
    order_service = OrderService()
    status_service_class = OrderStatusService

    def get_status_service(self):
        return self.status_service_class()

    def _build_order_actor(self, order):
        user = self.request.user
        if not user.is_authenticated:
            role = "ANONYMOUS"
        elif user.is_staff or user.is_superuser:
            role = "ADMIN"
        elif hasattr(user, "producer") and (
            order.producer_id == getattr(user.producer, "id", None)
            or order.dish.producer_id == getattr(user.producer, "id", None)
        ):
            role = "SELLER"
        elif order.user_id == user.id:
            role = "BUYER"
        else:
            role = "UNKNOWN"
        return OrderActor(user=user, role=role)

    def get_queryset(self):
        """Возвращает список заказов для текущего пользователя."""
        user = self.request.user

        # Если пользователь - продавец, возвращаем заказы его магазина
        if hasattr(user, "producer"):
            return Order.objects.filter(producer=user.producer).select_related(
                "dish", "producer", "user"
            )

        # Иначе возвращаем заказы пользователя
        return Order.objects.filter(user=user).select_related("dish", "producer", "user")

    def get_serializer_class(self):
        """Возвращает сериализатор в зависимости от действия."""
        if self.action == "list":
            return OrderListSerializer
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderDetailSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def complete(self, request, pk=None):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated_order = service.complete_by_buyer(order.id, actor)
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
        serializer = OrderDetailSerializer(updated_order)
        return Response(
            {
                "success": True,
                "message": "Заказ завершен, средства зачислены",
                "order": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_arrived(self, request, pk=None):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        actor = self._build_order_actor(order)
        service = self.get_status_service()
        try:
            updated_order = service.mark_arrived(order.id, actor)
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
        serializer = OrderDetailSerializer(updated_order)
        return Response(
            {
                "success": True,
                "message": "Заказ прибыл к месту назначения",
                "order": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        """
        Принятие заказа продавцом.

        POST /api/v1/orders/{id}/accept/

        Body:
        {
            "order_id": "uuid"
        }
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"detail": "Только продавцы могут принимать заказы"},
                status=status.HTTP_403_FORBIDDEN,
            )

        producer = user.producer

        # Проверяем, что продавец не забанен
        if producer.is_banned:
            return Response(
                {
                    "detail": f"Ваш магазин заблокирован. Причина: {producer.ban_reason}",
                    "is_banned": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            return Response(
                {"detail": "Вы можете принимать только свои заказы"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Валидируем данные
        serializer = OrderAcceptSerializer(data={"order_id": str(order.id)})
        serializer.is_valid(raise_exception=True)

        # Принимаем заказ
        try:
            updated_order = self.order_service.accept_order(order, producer)
        except Exception as e:
            logger.error(f"Error accepting order {order.id}: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = OrderDetailSerializer(updated_order)
        return Response(
            {
                "success": True,
                "message": "Заказ принят в работу",
                "order": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        Отклонение заказа продавцом.

        POST /api/v1/orders/{id}/reject/

        Body:
        {
            "order_id": "uuid",
            "reason": "Причина отклонения"
        }
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"detail": "Только продавцы могут отклонять заказы"},
                status=status.HTTP_403_FORBIDDEN,
            )

        producer = user.producer

        # Проверяем, что продавец не забанен
        if producer.is_banned:
            return Response(
                {
                    "detail": f"Ваш магазин заблокирован. Причина: {producer.ban_reason}",
                    "is_banned": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            return Response(
                {"detail": "Вы можете отклонять только свои заказы"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Валидируем данные
        serializer = OrderRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "")

        # Отклоняем заказ
        try:
            updated_order = self.order_service.reject_order(order, producer, reason)
        except Exception as e:
            logger.error(f"Error rejecting order {order.id}: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = OrderDetailSerializer(updated_order)
        return Response(
            {
                "success": True,
                "message": "Заказ отклонен. Штраф применен.",
                "order": response_serializer.data,
                "penalty_amount": float(updated_order.penalty_amount),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        Отмена заказа покупателем или продавцом.

        POST /api/v1/orders/{id}/cancel/

        Body:
        {
            "order_id": "uuid",
            "reason": "Причина отмены"
        }
        """
        user = request.user

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Валидируем данные
        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "")

        # Проверяем, кто отменяет заказ
        is_producer = hasattr(user, "producer")

        if is_producer:
            # Продавец отменяет уже принятый заказ
            producer = user.producer

            # Проверяем, что продавец не забанен
            if producer.is_banned:
                return Response(
                    {
                        "detail": f"Ваш магазин заблокирован. Причина: {producer.ban_reason}",
                        "is_banned": True,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Проверяем, что заказ принадлежит этому магазину
            if order.producer != producer:
                return Response(
                    {"detail": "Вы можете отменять только свои заказы"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                updated_order = self.order_service.cancel_order_by_seller(order, producer, reason)
            except Exception as e:
                logger.error(f"Error cancelling order {order.id} by seller: {e}")
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response_serializer = OrderDetailSerializer(updated_order)
            return Response(
                {
                    "success": True,
                    "message": "Заказ отменен. Штраф 30% применен.",
                    "order": response_serializer.data,
                    "penalty_amount": float(updated_order.penalty_amount),
                },
                status=status.HTTP_200_OK,
            )
        else:
            # Покупатель отменяет заказ
            if order.user != user:
                return Response(
                    {"detail": "Вы можете отменять только свои заказы"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                updated_order = self.order_service.cancel_order_by_buyer(order, user, reason)
            except Exception as e:
                logger.error(f"Error cancelling order {order.id} by buyer: {e}")
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response_serializer = OrderDetailSerializer(updated_order)
            response_data = {
                "success": True,
                "message": "Заказ отменен",
                "order": response_serializer.data,
                "refund_amount": float(updated_order.refund_amount),
            }

            # Если была компенсация магазину, добавляем информацию
            if updated_order.finished_photo:
                response_data["message"] = (
                    "Заказ отменен. Компенсация магазину 10% применена. "
                    "Остаток средств возвращен."
                )
                response_data["compensation_amount"] = float(
                    updated_order.total_price * 0.10
                )

            return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_unsatisfactory(self, request, pk=None):
        """
        Покупатель отмечает заказ как неудовлетворительно.
        Открывается окно для претензий.

        POST /api/v1/orders/{id}/mark_unsatisfactory/

        Body:
        {
            "complaint_text": "Текст претензии"
        }
        """
        user = request.user

        # Проверяем, что пользователь - не продавец
        if hasattr(user, "producer"):
            return Response(
                {"detail": "Только покупатели могут отмечать заказы как неудовлетворительные"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем, что заказ принадлежит этому пользователю
        if order.user != user:
            return Response(
                {"detail": "Вы можете отмечать только свои заказы"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Проверяем, что заказ в подходящем статусе
        if order.status not in ["ARRIVED", "COMPLETED"]:
            return Response(
                {"detail": "Заказ должен быть в статусе ARRIVED или COMPLETED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        complaint_text = request.data.get("complaint_text", "")

        # Создаем претензию
        from api.services.dispute_service import DisputeService
        dispute_service = DisputeService()

        try:
            dispute = dispute_service.create_complaint_from_order(
                order=order,
                user=user,
                complaint_text=complaint_text
            )
            return Response(
                {
                    "success": True,
                    "message": "Претензия создана",
                    "dispute_id": str(dispute.id),
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def upload_finished_photo(self, request, pk=None):
        """
        Продавец загружает фото готового товара.

        POST /api/v1/orders/{id}/upload_finished_photo/

        Body:
        {
            "photo_url": "URL фото готового товара"
        }
        """
        user = request.user

        # Проверяем, что пользователь - продавец
        if not hasattr(user, "producer"):
            return Response(
                {"detail": "Только продавцы могут загружать фото готового товара"},
                status=status.HTTP_403_FORBIDDEN,
            )

        producer = user.producer

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем, что заказ принадлежит этому магазину
        if order.producer != producer:
            return Response(
                {"detail": "Вы можете загружать фото только для своих заказов"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Проверяем, что заказ в подходящем статусе
        if order.status != "COOKING":
            return Response(
                {"detail": "Фото можно загрузить только для заказа в статусе COOKING"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        photo_url = request.data.get("photo_url", "")

        if not photo_url:
            return Response(
                {"detail": "Необходимо указать URL фото"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Загружаем фото
        try:
            updated_order = self.order_service.upload_finished_photo(order, photo_url)
            return Response(
                {
                    "success": True,
                    "message": "Фото загружено",
                    "order": OrderDetailSerializer(updated_order).data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Error uploading finished photo for order {order.id}: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def add_tips(self, request, pk=None):
        """
        Покупатель добавляет чаевые.

        POST /api/v1/orders/{id}/add_tips/

        Body:
        {
            "amount": 100.00
        }
        """
        user = request.user

        # Проверяем, что пользователь - не продавец
        if hasattr(user, "producer"):
            return Response(
                {"detail": "Только покупатели могут добавлять чаевые"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Получаем заказ
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем, что заказ принадлежит этому пользователю
        if order.user != user:
            return Response(
                {"detail": "Вы можете добавлять чаевые только для своих заказов"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Проверяем, что заказ в подходящем статусе
        if order.status not in ["DELIVERING", "ARRIVED", "COMPLETED"]:
            return Response(
                {"detail": "Чаевые можно добавить только для доставленного или завершенного заказа"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = request.data.get("amount", 0)

        try:
            amount_float = float(amount)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Некорректная сумма чаевых"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount_float <= 0:
            return Response(
                {"detail": "Сумма чаевых должна быть больше 0"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Добавляем чаевые
        try:
            updated_order = self.order_service.add_tips(order, amount_float)
            return Response(
                {
                    "success": True,
                    "message": "Чаевые добавлены",
                    "order": OrderDetailSerializer(updated_order).data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Error adding tips for order {order.id}: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
