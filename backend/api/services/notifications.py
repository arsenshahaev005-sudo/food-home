from django.urls import reverse

from api.models import Notification, Order


class NotificationService:
    def _create_order_notification(self, user, order, title, message):
        if user is None:
            return
        if not isinstance(order, Order):
            return
        link = reverse("order-detail", args=[order.id]) if hasattr(order, "id") else ""
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            type="ORDER",
            link=link,
        )

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

