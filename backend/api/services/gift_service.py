from dataclasses import dataclass
from decimal import Decimal
from typing import Optional, Dict, Any

from django.db import transaction
from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from django.utils import timezone
from django.utils import timezone as dj_timezone

from api.models import (
    Order,
    GiftOrder,
    GiftProduct,
    GiftPayment,
    GiftActivationAttempt,
    GiftActivationIdempotency,
    GiftCreateIdempotency,
    RefundOperation,
    OutboxEvent,
)


@dataclass
class GiftActivationContext:
    order: Order
    recipient_user: Optional[object] = None


@dataclass
class GiftCreateDTO:
    product: GiftProduct
    recipient_contact_email: str
    recipient_contact_phone: str
    recipient_name: str
    idempotency_key: str = ""


class GiftService:
    def _ensure_contact_present(self, order: Order):
        phone = (order.recipient_phone or "").strip()
        if not phone:
            raise ValueError("Recipient phone is required for gift order")

    def _generate_code(self) -> str:
        import uuid

        return uuid.uuid4().hex[:10].upper()

    def _generate_token(self) -> str:
        import uuid

        return uuid.uuid4().hex

    @transaction.atomic
    def ensure_gift_for_order(self, order: Order) -> GiftOrder:
        if not order.is_gift:
            raise ValueError("Order is not marked as gift")
        existing = getattr(order, "gift_order", None)
        if existing:
            return existing
        self._ensure_contact_present(order)
        gift = GiftOrder.objects.create(
            payer=getattr(order, "user", None),
            recipient_contact_phone=order.recipient_phone or "",
            recipient_name=order.user_name or "",
            state=GiftOrder.State.CREATED,
            order=order,
            gift_code=self._generate_code(),
            activation_token=self._generate_token(),
            amount=order.total_price,
            currency="RUB",
        )
        return gift

    @transaction.atomic
    def mark_paid(self, order: Order) -> GiftOrder:
        gift = self.ensure_gift_for_order(order)
        return gift

    @transaction.atomic
    def activate_from_order(self, ctx: GiftActivationContext) -> GiftOrder:
        order = ctx.order
        gift = self.ensure_gift_for_order(order)
        if gift.state != GiftOrder.State.CREATED:
            return gift
        if ctx.recipient_user and not gift.recipient_user:
            gift.recipient_user = ctx.recipient_user
        gift.state = GiftOrder.State.ACTIVATED
        gift.activated_at = timezone.now()
        gift.save(update_fields=["recipient_user", "state", "activated_at"])
        return gift

    @transaction.atomic
    def cancel_before_activation(self, order: Order, by_system: bool = False) -> GiftOrder:
        gift = self.ensure_gift_for_order(order)
        if gift.state != GiftOrder.State.CREATED:
            return gift
        gift.state = (
            GiftOrder.State.CANCELLED_BY_SYSTEM_EXPIRED
            if by_system
            else GiftOrder.State.CANCELLED_BY_PAYER
        )
        gift.cancelled_at = timezone.now()
        gift.save(update_fields=["state", "cancelled_at"])
        return gift


class PublicGiftService:
    """
    GiftOrder / Order invariants (ADR-001):

    - GiftOrder state transitions are independent from Order.status transitions after activation.
      After GiftOrder.state = ACTIVATED, changes in Order.status (for example, CANCELLED or
      DELIVERED) must not change GiftOrder.state back to CREATED or any other "unconsumed" state.
    - GiftOrder does not have a CONSUMED state. Consumption is expressed as
      GiftOrder.state = ACTIVATED plus a single GiftConsumed domain event.
    - GiftConsumed is emitted once during successful activation in PublicGiftService.activate_gift
      together with GiftActivated and OrderCreatedFromGift. All three events share the same
      correlation_id equal to GiftActivationIdempotency.id, which is used for tracing, analytics
      and anti-fraud.
    """
    def _generate_code(self) -> str:
        import uuid

        return uuid.uuid4().hex[:10].upper()

    def _generate_token(self) -> str:
        import uuid

        return uuid.uuid4().hex

    def _calculate_valid_until(self, product: GiftProduct) -> Optional[Any]:
        rules = product.rules or {}
        expiry = rules.get("expiry_policy") or {}
        days = expiry.get("days")
        if not days:
            return None
        try:
            days_int = int(days)
        except (TypeError, ValueError):
            return None
        return dj_timezone.now() + dj_timezone.timedelta(days=days_int)

    @transaction.atomic
    def create_gift(
        self,
        payer,
        product: GiftProduct,
        recipient_contact_email: str,
        recipient_contact_phone: str,
        recipient_name: str,
    ) -> GiftOrder:
        valid_until = self._calculate_valid_until(product)
        gift = GiftOrder.objects.create(
            payer=payer,
            recipient_contact_email=recipient_contact_email or "",
            recipient_contact_phone=recipient_contact_phone or "",
            recipient_name=recipient_name or "",
            state=GiftOrder.State.CREATED,
            gift_code=self._generate_code(),
            activation_token=self._generate_token(),
            amount=product.price,
            currency="RUB",
            valid_until=valid_until,
            gift_product=product,
        )
        GiftPayment.objects.create(
            gift=gift,
            provider="INTERNAL",
            amount=gift.amount,
            amount_captured=gift.amount,
            amount_refunded=0,
            currency=gift.currency,
            status=GiftPayment.Status.PAID,
            metadata={},
        )
        OutboxEvent.objects.create(
            aggregate_type="gift",
            aggregate_id=gift.id,
            event_type="GiftCreated",
            payload={
                "gift_id": str(gift.id),
                "lifecycle_correlation_id": str(gift.id),
            },
        )
        return gift

    @transaction.atomic
    def create_bulk_gifts(
        self,
        payer,
        items: list[GiftCreateDTO],
    ) -> list[GiftOrder]:
        results: list[GiftOrder] = []
        for dto in items:
            key = (dto.idempotency_key or "").strip()
            if key:
                with transaction.atomic():
                    record, created = (
                        GiftCreateIdempotency.objects.select_for_update()
                        .get_or_create(idempotency_key=key)
                    )
                    if record.gift_id:
                        results.append(record.gift)
                        continue
                    gift = self.create_gift(
                        payer=payer,
                        product=dto.product,
                        recipient_contact_email=dto.recipient_contact_email,
                        recipient_contact_phone=dto.recipient_contact_phone,
                        recipient_name=dto.recipient_name,
                    )
                    record.gift = gift
                    record.save(update_fields=["gift", "updated_at"])
                    results.append(gift)
                    continue
            gift = self.create_gift(
                payer=payer,
                product=dto.product,
                recipient_contact_email=dto.recipient_contact_email,
                recipient_contact_phone=dto.recipient_contact_phone,
                recipient_name=dto.recipient_name,
            )
            results.append(gift)
        return results

    def _check_activatable_reason(self, gift: GiftOrder) -> Dict[str, Optional[str]]:
        if gift.state != GiftOrder.State.CREATED:
            return {"is_activatable": False, "reason": "not_created"}
        now = dj_timezone.now()
        if gift.valid_until and gift.valid_until < now:
            return {"is_activatable": False, "reason": "expired"}
        payment = getattr(gift, "payment", None)
        if not payment or payment.status != GiftPayment.Status.PAID:
            return {"is_activatable": False, "reason": "payment_not_completed"}
        product = gift.gift_product
        if not product or not product.active:
            return {"is_activatable": False, "reason": "product_inactive"}
        return {"is_activatable": True, "reason": None}

    def check_activatable(self, gift: GiftOrder) -> Dict[str, Optional[str]]:
        return self._check_activatable_reason(gift)

    @transaction.atomic
    def activate_gift(
        self,
        activation_token: str,
        recipient_user,
        activation_data: Dict[str, Any],
        activation_ip: str,
        activation_user_agent: str,
    ):
        gift = (
            GiftOrder.objects.select_related("gift_product", "payment", "order")
            .get(activation_token=activation_token)
        )
        idempotency, _ = GiftActivationIdempotency.objects.get_or_create(
            activation_token=activation_token,
            defaults={"gift": gift},
        )
        now = dj_timezone.now()
        if gift.state == GiftOrder.State.ACTIVATED:
            existing_order = gift.order or idempotency.order
            if not existing_order:
                raise ValueError("gift_not_available")
            if not idempotency.success or idempotency.order_id != existing_order.id:
                idempotency.gift = gift
                idempotency.order = existing_order
                idempotency.success = True
                idempotency.save(update_fields=["gift", "order", "success", "updated_at"])
            return gift, existing_order
        if gift.state != GiftOrder.State.CREATED:
            raise ValueError("gift_not_available")
        gift = (
            GiftOrder.objects.select_for_update()
            .select_related("gift_product", "payment", "order")
            .get(id=gift.id)
        )
        if gift.state == GiftOrder.State.ACTIVATED:
            existing_order = gift.order or idempotency.order
            if not existing_order:
                raise ValueError("gift_not_available")
            if not idempotency.success or idempotency.order_id != existing_order.id:
                idempotency.gift = gift
                idempotency.order = existing_order
                idempotency.success = True
                idempotency.save(update_fields=["gift", "order", "success", "updated_at"])
            return gift, existing_order
        if gift.state != GiftOrder.State.CREATED:
            raise ValueError("gift_not_available")
        if gift.valid_until and gift.valid_until < now:
            gift.state = GiftOrder.State.CANCELLED_BY_SYSTEM_EXPIRED
            gift.cancelled_at = now
            gift.save(update_fields=["state", "cancelled_at", "updated_at"])
            OutboxEvent.objects.create(
                aggregate_type="gift",
                aggregate_id=gift.id,
                event_type="GiftExpired",
                payload={
                    "gift_id": str(gift.id),
                    "lifecycle_correlation_id": str(gift.id),
                },
            )
            raise ValueError("gift_expired")
        payment = getattr(gift, "payment", None)
        if not payment or payment.status != GiftPayment.Status.PAID:
            raise ValueError("payment_not_completed")
        product = gift.gift_product
        if not product or not product.active:
            raise ValueError("gift_not_available")
        dish = product.base_dish
        if not dish:
            raise ValueError("gift_not_configured")
        delivery_address = activation_data.get("delivery_address") or ""
        delivery_type = activation_data.get("delivery_type") or Order.DELIVERY_TYPE_CHOICES[0][0]
        recipient_phone = activation_data.get("recipient_phone") or gift.recipient_contact_phone
        recipient_name = activation_data.get("recipient_name") or gift.recipient_name
        if not recipient_phone:
            raise ValueError("recipient_phone_required")
        order = Order.objects.create(
            user=recipient_user,
            user_name=recipient_name or getattr(recipient_user, "get_full_name", lambda: "")() or getattr(recipient_user, "email", "") or "Recipient",
            phone=recipient_phone,
            dish=dish,
            producer=getattr(dish, "producer", None),
            quantity=1,
            total_price=gift.amount,
            status="WAITING_FOR_ACCEPTANCE",
            delivery_type=delivery_type,
            delivery_address_text=delivery_address,
        )
        minutes_to_accept = 60
        order.acceptance_deadline = now + dj_timezone.timedelta(minutes=minutes_to_accept)
        order.save(update_fields=["acceptance_deadline"])
        gift.state = GiftOrder.State.ACTIVATED
        gift.activated_at = now
        gift.order = order
        gift.recipient_user = recipient_user
        gift.last_activation_attempt_at = now
        gift.last_activation_ip = activation_ip
        gift.last_activation_user_agent = activation_user_agent
        gift.save(
            update_fields=[
                "state",
                "activated_at",
                "order",
                "recipient_user",
                "last_activation_attempt_at",
                "last_activation_ip",
                "last_activation_user_agent",
                "updated_at",
            ]
        )
        idempotency.gift = gift
        idempotency.order = order
        idempotency.success = True
        idempotency.save(update_fields=["gift", "order", "success", "updated_at"])
        correlation_id = str(idempotency.id)
        OutboxEvent.objects.create(
            aggregate_type="gift",
            aggregate_id=gift.id,
            event_type="GiftActivated",
            payload={
                "gift_id": str(gift.id),
                "order_id": str(order.id),
                "correlation_id": correlation_id,
                "lifecycle_correlation_id": str(gift.id),
            },
        )
        OutboxEvent.objects.create(
            aggregate_type="gift",
            aggregate_id=gift.id,
            event_type="GiftConsumed",
            payload={
                "gift_id": str(gift.id),
                "order_id": str(order.id),
                "correlation_id": correlation_id,
                "consumed_at": now.isoformat(),
                "lifecycle_correlation_id": str(gift.id),
            },
        )
        OutboxEvent.objects.create(
            aggregate_type="order",
            aggregate_id=order.id,
            event_type="OrderCreatedFromGift",
            payload={
                "order_id": str(order.id),
                "gift_id": str(gift.id),
                "correlation_id": correlation_id,
            },
        )
        transaction.on_commit(
            lambda: GiftActivationAttempt.objects.create(
                gift=gift,
                ip=activation_ip,
                user_agent=activation_user_agent,
                action="ACTIVATE",
                outcome=GiftActivationAttempt.Outcome.SUCCESS,
            )
        )
        return gift, order

    @transaction.atomic
    def cancel_gift_by_payer(self, gift: GiftOrder) -> GiftOrder:
        gift = GiftOrder.objects.select_for_update().get(id=gift.id)
        if gift.state != GiftOrder.State.CREATED:
            return gift
        gift.state = GiftOrder.State.CANCELLED_BY_PAYER
        gift.cancelled_at = dj_timezone.now()
        gift.save(update_fields=["state", "cancelled_at", "updated_at"])
        OutboxEvent.objects.create(
            aggregate_type="gift",
            aggregate_id=gift.id,
            event_type="GiftCancelled",
            payload={
                "gift_id": str(gift.id),
                "lifecycle_correlation_id": str(gift.id),
            },
        )
        return gift


@transaction.atomic
def expire_gifts_batch(limit: int = 100) -> int:
    now = dj_timezone.now()
    qs = (
        GiftOrder.objects.select_for_update()
        .filter(
            state=GiftOrder.State.CREATED,
            valid_until__isnull=False,
            valid_until__lt=now,
        )
        .order_by("valid_until")[:limit]
    )
    gifts = list(qs)
    if not gifts:
        return 0
    processed = 0
    for gift in gifts:
        gift.state = GiftOrder.State.CANCELLED_BY_SYSTEM_EXPIRED
        gift.cancelled_at = now
        gift.save(update_fields=["state", "cancelled_at", "updated_at"])
        OutboxEvent.objects.create(
            aggregate_type="gift",
            aggregate_id=gift.id,
            event_type="GiftExpired",
            payload={
                "gift_id": str(gift.id),
                "lifecycle_correlation_id": str(gift.id),
            },
        )
        processed += 1
    return processed


class GiftRefundService:
    @transaction.atomic
    def apply_refund(
        self,
        payment: GiftPayment,
        business_key: str,
        source: RefundOperation.Source,
        requested_amount: Decimal,
        approved_amount: Optional[Decimal] = None,
    ):
        if approved_amount is None:
            approved_amount = requested_amount
        requested_amount = Decimal(requested_amount)
        approved_amount = Decimal(approved_amount)
        payment = (
            GiftPayment.objects.select_for_update()
            .select_related("gift")
            .get(id=payment.id)
        )
        op, created = (
            RefundOperation.objects.select_for_update()
            .get_or_create(
                business_key=business_key,
                defaults={
                    "payment": payment,
                    "source": source,
                    "requested_amount": requested_amount,
                    "approved_amount": approved_amount,
                    "status": RefundOperation.Status.REQUESTED,
                },
            )
        )
        if not created:
            if op.payment_id != payment.id:
                raise ValueError("refund_business_key_conflict")
            if (
                op.requested_amount != requested_amount
                or op.approved_amount != approved_amount
            ):
                op.requested_amount = requested_amount
                op.approved_amount = approved_amount
                op.save(update_fields=["requested_amount", "approved_amount", "updated_at"])
        if created:
            payment.amount_refunded = payment.amount_refunded + approved_amount
            payment.version = payment.version + 1
            if payment.amount_refunded >= payment.amount_captured:
                payment.status = GiftPayment.Status.REFUNDED
            payment.save(
                update_fields=["amount_refunded", "version", "status", "updated_at"]
            )
            gift = payment.gift
            lifecycle_id = str(gift.id) if gift else None
            OutboxEvent.objects.create(
                aggregate_type="gift",
                aggregate_id=gift.id if gift else payment.id,
                event_type="GiftRefundRequested",
                payload={
                    "gift_id": str(gift.id) if gift else None,
                    "payment_id": str(payment.id),
                    "business_key": op.business_key,
                    "requested_amount": str(op.requested_amount),
                    "approved_amount": str(op.approved_amount),
                    "status": op.status,
                    "lifecycle_correlation_id": lifecycle_id,
                },
            )
            if payment.amount_refunded >= payment.amount_captured:
                OutboxEvent.objects.create(
                    aggregate_type="gift",
                    aggregate_id=gift.id if gift else payment.id,
                    event_type="GiftRefunded",
                    payload={
                        "gift_id": str(gift.id) if gift else None,
                        "payment_id": str(payment.id),
                        "business_key": op.business_key,
                        "refunded_amount": str(payment.amount_refunded),
                        "lifecycle_correlation_id": lifecycle_id,
                    },
                )
        return payment, op


@transaction.atomic
def process_sla_gifts(limit: int = 100) -> int:
    now = dj_timezone.now()
    qs = (
        GiftOrder.objects.select_for_update()
        .select_related("payment", "payer")
        .filter(
            state__in=[
                GiftOrder.State.CREATED,
                GiftOrder.State.ACTIVATED,
                GiftOrder.State.CANCELLED_BY_SYSTEM_EXPIRED,
            ],
            valid_until__isnull=False,
            valid_until__lt=now,
        )
        .order_by("valid_until")[:limit]
    )
    gifts = list(qs)
    if not gifts:
        return 0
    refund_service = GiftRefundService()
    processed = 0
    for gift in gifts:
        payment = getattr(gift, "payment", None)
        if not payment:
            continue
        remaining = payment.amount_captured - payment.amount_refunded
        if remaining <= 0:
            continue
        business_key = f"SLA:{gift.id}"
        before_refunded = payment.amount_refunded
        payment, op = refund_service.apply_refund(
            payment=payment,
            business_key=business_key,
            source=RefundOperation.Source.SLA,
            requested_amount=remaining,
            approved_amount=remaining,
        )
        payment.refresh_from_db()
        if payment.amount_refunded > before_refunded:
            processed += 1
            payer = gift.payer
            if payer:
                OutboxEvent.objects.create(
                    aggregate_type="gift",
                    aggregate_id=gift.id,
                    event_type="GiftRefundNotification",
                    payload={
                        "gift_id": str(gift.id),
                        "payment_id": str(payment.id),
                        "payer_id": str(payer.id),
                        "channel": "email_sms",
                        "reason": "SLA_EXPIRED",
                        "lifecycle_correlation_id": str(gift.id),
                    },
                )
    return processed


class GiftAnalyticsService:
    def get_statistics(self, start, end, recipient_user=None) -> Dict[str, Any]:
        events_qs = OutboxEvent.objects.filter(
            aggregate_type="gift",
            created_at__gte=start,
            created_at__lte=end,
        )
        if recipient_user is not None:
            gift_ids_qs = GiftOrder.objects.filter(recipient_user=recipient_user).values_list("id", flat=True)
            events_qs = events_qs.filter(aggregate_id__in=gift_ids_qs)
        counts_map = {
            "GiftCreated": 0,
            "GiftActivated": 0,
            "GiftConsumed": 0,
            "GiftRefunded": 0,
            "GiftCancelled": 0,
            "GiftExpired": 0,
        }
        aggregated = (
            events_qs.values("event_type")
            .annotate(count=Count("id"))
        )
        for row in aggregated:
            event_type = row["event_type"]
            if event_type in counts_map:
                counts_map[event_type] = row["count"]

        duration_expr = ExpressionWrapper(
            F("activated_at") - F("created_at"),
            output_field=DurationField(),
        )
        activation_filter = {
            "activated_at__isnull": False,
            "activated_at__gte": start,
            "activated_at__lte": end,
        }
        if recipient_user is not None:
            activation_filter["recipient_user"] = recipient_user
        activation_agg = GiftOrder.objects.filter(**activation_filter).aggregate(avg_duration=Avg(duration_expr))
        avg_duration = activation_agg["avg_duration"]
        avg_activation_time_seconds = (
            avg_duration.total_seconds() if avg_duration is not None else 0.0
        )

        refunds_qs = RefundOperation.objects.filter(
            created_at__gte=start,
            created_at__lte=end,
        )
        if recipient_user is not None:
            refunds_qs = refunds_qs.filter(payment__gift__recipient_user=recipient_user)
        total_refunds = refunds_qs.count()
        sla_refunds = refunds_qs.filter(source=RefundOperation.Source.SLA).count()
        sla_refund_percentage = (
            float(sla_refunds * 100) / float(total_refunds)
            if total_refunds > 0
            else 0.0
        )

        recipient_stats = None
        if recipient_user is not None:
            base_qs = GiftOrder.objects.filter(recipient_user=recipient_user)
            recipient_total = base_qs.count()
            recipient_activated = base_qs.filter(state=GiftOrder.State.ACTIVATED).count()
            recipient_sla_refunds = RefundOperation.objects.filter(
                payment__gift__recipient_user=recipient_user,
                source=RefundOperation.Source.SLA,
                created_at__gte=start,
                created_at__lte=end,
            ).count()
            recipient_stats = {
                "total_received": recipient_total,
                "activated": recipient_activated,
                "sla_refunds": recipient_sla_refunds,
            }

        return {
            "counts": counts_map,
            "avg_activation_time_seconds": avg_activation_time_seconds,
            "sla_refund_percentage": sla_refund_percentage,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "recipient": recipient_stats,
        }
