from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models import Order, Payment
from .order_finance_service import OrderFinanceService
from .payment_providers import BasePaymentProvider, DevFakePaymentProvider


class PaymentService:
    def __init__(self, provider: BasePaymentProvider | None = None):
        self.provider = provider or DevFakePaymentProvider()
        self.order_finance = OrderFinanceService()

    @transaction.atomic
    def init_payment(self, order: Order, return_url: str):
        if order.status != "WAITING_FOR_PAYMENT":
            raise ValueError("Order is not in payment state")

        amount = order.total_price

        payment = Payment.objects.create(
            order=order,
            amount=amount,
            currency="RUB",
            provider=Payment.Provider.DEV_FAKE,
            status=Payment.Status.INITIATED,
        )

        provider_res = self.provider.init_payment(
            payment_id=str(payment.id),
            amount=amount,
            description=f"Order {order.id}",
            return_url=return_url,
        )

        payment.provider_payment_id = provider_res["provider_payment_id"]
        payment.provider_raw_response = provider_res.get("raw") or {}
        payment.status = Payment.Status.PENDING
        payment.save(update_fields=["provider_payment_id", "provider_raw_response", "status"])

        order.current_payment = payment
        order.tinkoff_payment_id = payment.provider_payment_id
        order.save(update_fields=["current_payment", "tinkoff_payment_id"])

        return payment, provider_res["payment_url"]

    @transaction.atomic
    def simulate_payment_success(self, payment: Payment) -> Payment:
        if payment.status in [
            Payment.Status.SUCCEEDED,
            Payment.Status.REFUNDED,
            Payment.Status.PARTIALLY_REFUNDED,
        ]:
            return payment

        payment.status = Payment.Status.SUCCEEDED
        payment.paid_at = timezone.now()
        payment.save(update_fields=["status", "paid_at"])
        return payment

    @transaction.atomic
    def simulate_payment_fail(
        self,
        payment: Payment,
        error_code: str = "",
        error_message: str = "",
    ) -> Payment:
        if payment.status not in [Payment.Status.PENDING, Payment.Status.INITIATED]:
            return payment

        if payment.provider_payment_id:
            self.provider.simulate_fail(payment.provider_payment_id)

        payment.status = Payment.Status.FAILED
        payment.error_code = error_code
        payment.error_message = error_message
        payment.save(update_fields=["status", "error_code", "error_message"])

        return payment

    @transaction.atomic
    def refund_payment(self, payment: Payment, amount: Decimal) -> Payment:
        if payment.status not in [
            Payment.Status.SUCCEEDED,
            Payment.Status.PARTIALLY_REFUNDED,
        ]:
            raise ValueError("Payment not in refundable state")

        if payment.provider_payment_id:
            provider_res = self.provider.refund(payment.provider_payment_id, amount)
        else:
            provider_res = {"refunded_amount": str(amount)}

        payment.refunded_amount = payment.refunded_amount + amount
        payment.refunded_at = timezone.now()

        if payment.refunded_amount >= payment.amount:
            payment.status = Payment.Status.REFUNDED
        else:
            payment.status = Payment.Status.PARTIALLY_REFUNDED

        raw = dict(payment.provider_raw_response or {})
        raw["last_refund"] = provider_res
        payment.provider_raw_response = raw

        payment.save(
            update_fields=[
                "refunded_amount",
                "refunded_at",
                "status",
                "provider_raw_response",
            ]
        )

        order = payment.order
        self.order_finance.apply_refund(order, refund_total=amount, refund_tips=Decimal("0"))

        return payment
