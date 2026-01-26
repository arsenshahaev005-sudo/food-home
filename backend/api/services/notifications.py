from django.urls import reverse
import logging

from api.models import Notification, Order

logger = logging.getLogger(__name__)


class NotificationService:
    def _create_order_notification(self, user, order, title, message):
        if user is None:
            return
        if not isinstance(order, Order):
            return
        try:
            link = reverse("order-detail", args=[order.id]) if hasattr(order, "id") else ""
            Notification.objects.create(
                user=user,
                title=title,
                message=message,
                type="ORDER",
                link=link,
            )
        except Exception as e:
            logger.error(f"Failed to create notification for user {user.id}: {e}", exc_info=True)

    def order_cancelled(self, order):
        title = "Заказ отменен"
        message = f"Заказ {order.id} был отменен."
        self._create_order_notification(getattr(order, "user", None), order, title, message)
        producer_user = getattr(getattr(order.dish, "producer", None), "user", None)
        self._create_order_notification(producer_user, order, title, message)

    def order_accepted(self, order):
        title = "Заказ принят"
        message = f"Ваш заказ {order.id} принят в работу."
        self._create_order_notification(getattr(order, "user", None), order, title, message)

    def order_ready(self, order):
        title = "Заказ готов"
        message = f"Заказ {order.id} готов."
        self._create_order_notification(getattr(order, "user", None), order, title, message)

    def order_delivering(self, order):
        title = "Заказ в доставке"
        message = f"Заказ {order.id} передан в доставку."
        self._create_order_notification(getattr(order, "user", None), order, title, message)

    def order_arrived(self, order):
        title = "Заказ доставлен"
        message = f"Заказ {order.id} прибыл к месту доставки."
        self._create_order_notification(getattr(order, "user", None), order, title, message)

    def order_completed(self, order):
        title = "Заказ завершен"
        message = f"Заказ {order.id} успешно завершен."
        self._create_order_notification(getattr(order, "user", None), order, title, message)

    def gift_received(self, gift_order):
        """
        Отправить уведомление о получении подарка.
        """
        from api.models import GiftOrder, Notification

        if not isinstance(gift_order, GiftOrder):
            return

        recipient = gift_order.recipient_user
        if not recipient:
            return

        try:
            title = "Вы получили подарок!"
            message = f"Вам подарили {gift_order.gift_product.name if gift_order.gift_product else 'подарок'}."

            Notification.objects.create(
                user=recipient,
                title=title,
                message=message,
                type="GIFT",
                link=f"/my-gifts/",
            )
            logger.info(f"Gift notification sent to user {recipient.id}")
        except Exception as e:
            logger.error(f"Failed to create gift notification: {e}", exc_info=True)

