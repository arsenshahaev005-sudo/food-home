from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from api.models import Order


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class OrderFinanceSnapshot:
    item_total_full: Decimal
    effective_item_total: Decimal
    effective_tips: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    producer_gross_amount: Decimal
    producer_net_amount: Decimal
    payable_amount: Decimal
    refunded_commission_delta: Decimal


class OrderFinanceService:
    def _get_commission_rate(self, order: Order) -> Decimal:
        rate = order.commission_rate_snapshot
        if not rate:
            producer = order.producer or getattr(order.dish, "producer", None)
            if producer is not None:
                rate = producer.total_commission_rate
            else:
                rate = Decimal("0")
        return _to_decimal(rate)

    def _get_item_total_full(self, order: Order) -> Decimal:
        total = _to_decimal(order.total_price)
        delivery = _to_decimal(order.delivery_price)
        base = total - delivery
        if base < 0:
            base = Decimal("0")
        return base

    def calculate_snapshot(self, order: Order) -> OrderFinanceSnapshot:
        commission_rate = self._get_commission_rate(order)
        item_total_full = self._get_item_total_full(order)

        refunded_total = _to_decimal(getattr(order, "refunded_total_amount", 0))
        effective_item_total = item_total_full - refunded_total
        if effective_item_total < 0:
            effective_item_total = Decimal("0")

        tips_amount = _to_decimal(getattr(order, "tips_amount", 0))
        refunded_tips = _to_decimal(getattr(order, "refunded_tips_amount", 0))
        effective_tips = tips_amount - refunded_tips
        if effective_tips < 0:
            effective_tips = Decimal("0")

        commission_amount = _q2(effective_item_total * commission_rate)

        producer_gross_amount = effective_item_total
        producer_net_amount = producer_gross_amount - commission_amount + effective_tips
        if producer_net_amount < 0:
            producer_net_amount = Decimal("0")

        payable_amount = producer_net_amount

        current_commission = _to_decimal(getattr(order, "commission_amount", 0))
        refunded_commission_delta = current_commission - commission_amount

        return OrderFinanceSnapshot(
            item_total_full=item_total_full,
            effective_item_total=effective_item_total,
            effective_tips=effective_tips,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            producer_gross_amount=producer_gross_amount,
            producer_net_amount=producer_net_amount,
            payable_amount=payable_amount,
            refunded_commission_delta=refunded_commission_delta,
        )

    @transaction.atomic
    def on_completed(self, order: Order) -> Order:
        snapshot = self.calculate_snapshot(order)

        order.commission_rate_snapshot = snapshot.commission_rate
        order.commission_amount = snapshot.commission_amount
        order.producer_gross_amount = snapshot.producer_gross_amount
        order.producer_net_amount = snapshot.producer_net_amount
        order.payable_amount = snapshot.payable_amount

        if order.payout_status == "NOT_ACCRUED":
            producer = order.producer or getattr(order.dish, "producer", None)
            if producer:
                producer.balance = _to_decimal(producer.balance) + snapshot.payable_amount
                producer.save(update_fields=["balance"])
            order.payout_status = "ACCRUED"
            order.payout_accrued_at = timezone.now()

        order.save(
            update_fields=[
                "commission_rate_snapshot",
                "commission_amount",
                "producer_gross_amount",
                "producer_net_amount",
                "payable_amount",
                "payout_status",
                "payout_accrued_at",
            ]
        )

        return order

    @transaction.atomic
    def apply_refund(
        self,
        order: Order,
        refund_total: Decimal,
        refund_tips: Decimal = Decimal("0"),
    ) -> Order:
        refund_total = _to_decimal(refund_total)
        refund_tips = _to_decimal(refund_tips)

        prev_payable = _to_decimal(getattr(order, "payable_amount", 0))
        prev_commission = _to_decimal(getattr(order, "commission_amount", 0))

        order.refunded_total_amount = _to_decimal(order.refunded_total_amount) + refund_total
        order.refunded_tips_amount = _to_decimal(order.refunded_tips_amount) + refund_tips

        snapshot = self.calculate_snapshot(order)

        commission_delta = prev_commission - snapshot.commission_amount
        order.refunded_commission_amount = (
            _to_decimal(order.refunded_commission_amount) + commission_delta
        )

        order.commission_amount = snapshot.commission_amount
        order.producer_gross_amount = snapshot.producer_gross_amount
        order.producer_net_amount = snapshot.producer_net_amount
        order.payable_amount = snapshot.payable_amount

        if order.status == "COMPLETED" and order.payout_status == "ACCRUED":
            producer = order.producer or getattr(order.dish, "producer", None)
            if producer:
                delta = snapshot.payable_amount - prev_payable
                if delta:
                    producer.balance = _to_decimal(producer.balance) + delta
                    producer.save(update_fields=["balance"])

        order.save(
            update_fields=[
                "refunded_total_amount",
                "refunded_tips_amount",
                "refunded_commission_amount",
                "commission_amount",
                "producer_gross_amount",
                "producer_net_amount",
                "payable_amount",
            ]
        )

        return order

    @transaction.atomic
    def on_cancelled(self, order: Order) -> Order:
        if order.payout_status == "ACCRUED" and order.payable_amount:
            producer = order.producer or getattr(order.dish, "producer", None)
            if producer:
                producer.balance = _to_decimal(producer.balance) - _to_decimal(
                    order.payable_amount
                )
                producer.save(update_fields=["balance"])

        order.payable_amount = Decimal("0")
        order.payout_status = "NOT_ACCRUED"
        order.save(update_fields=["payable_amount", "payout_status"])

        return order

