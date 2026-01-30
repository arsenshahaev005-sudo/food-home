"""Scheduling service for calculating available delivery time slots."""

from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple

from django.utils import timezone


class SchedulingService:
    """Service for handling scheduled deliveries."""

    SLOT_INTERVAL_MINUTES = 30  # 30-minute slots
    MAX_ADVANCE_DAYS = 7
    PREP_BUFFER_MINUTES = 30
    ACCEPTANCE_BUFFER_HOURS = 2

    def get_available_time_slots(
        self,
        producer,
        dish,
        quantity: int,
        target_date: date,
        delivery_time_minutes: int = None
    ) -> List[dict]:
        """
        Calculate available time slots for a specific date.

        Args:
            producer: The seller/producer
            dish: The dish being ordered
            quantity: Number of items
            target_date: Date to check availability
            delivery_time_minutes: Delivery time override

        Returns:
            List of slot dictionaries with format:
            {
                "time": "2026-02-15T14:00:00Z",  # ISO format
                "display": "14:00",
                "available": true,
                "reason": null,
                "remaining_capacity": 3  # if limit is set
            }
        """
        from api.models import Order

        slots = []

        # Get working hours for this date
        working_hours = self._get_working_hours_for_date(producer, target_date)
        if not working_hours:
            # Closed on this day
            return []

        start_time, end_time = working_hours

        # Calculate earliest possible delivery time
        delivery_mins = delivery_time_minutes or producer.delivery_time_minutes
        earliest_possible = self._calculate_earliest_possible_time(
            dish, quantity, delivery_mins
        )

        # Generate slots for the day
        current_slot = datetime.combine(target_date, start_time)
        end_datetime = datetime.combine(target_date, end_time)

        # Make timezone-aware
        current_slot = timezone.make_aware(current_slot)
        end_datetime = timezone.make_aware(end_datetime)

        while current_slot <= end_datetime:
            is_available = True
            reason = None
            remaining_capacity = None

            # Check if slot is in the past
            if current_slot < timezone.now():
                is_available = False
                reason = "Время прошло"

            # Check if there's enough preparation time
            elif current_slot < earliest_possible:
                is_available = False
                reason = f"Недостаточно времени на подготовку (минимум {earliest_possible.strftime('%H:%M')})"

            # Check acceptance buffer (seller needs time to accept)
            elif current_slot < timezone.now() + timedelta(hours=self.ACCEPTANCE_BUFFER_HOURS):
                is_available = False
                reason = "Слишком скоро (нужно минимум 2 часа)"

            # Check slot capacity
            if is_available and producer.max_orders_per_slot > 0:
                slot_start = current_slot
                slot_end = current_slot + timedelta(minutes=self.SLOT_INTERVAL_MINUTES)

                # Count orders in this slot
                orders_in_slot = Order.objects.filter(
                    producer=producer,
                    scheduled_delivery_time__gte=slot_start,
                    scheduled_delivery_time__lt=slot_end,
                    status__in=['WAITING_FOR_PAYMENT', 'PENDING', 'ACCEPTED', 'READY', 'IN_DELIVERY']
                ).count()

                remaining_capacity = producer.max_orders_per_slot - orders_in_slot

                if orders_in_slot >= producer.max_orders_per_slot:
                    is_available = False
                    reason = f"Слот заполнен ({orders_in_slot}/{producer.max_orders_per_slot})"

            slot_data = {
                "time": current_slot.isoformat(),
                "display": current_slot.strftime("%H:%M"),
                "available": is_available,
                "reason": reason
            }

            if remaining_capacity is not None:
                slot_data["remaining_capacity"] = remaining_capacity

            slots.append(slot_data)

            current_slot += timedelta(minutes=self.SLOT_INTERVAL_MINUTES)

        return slots

    def validate_scheduled_time(
        self,
        producer,
        dish,
        quantity: int,
        scheduled_time: datetime,
        delivery_time_minutes: int = None
    ) -> Tuple[bool, str]:
        """
        Validate if a scheduled time is acceptable.

        Returns:
            (is_valid, error_message)
        """
        from api.models import Order

        now = timezone.now()

        # Check 1: Not in the past
        if scheduled_time < now:
            return False, "Нельзя запланировать доставку в прошлом"

        # Check 2: Not too far in advance
        if scheduled_time > now + timedelta(days=self.MAX_ADVANCE_DAYS):
            return False, f"Нельзя планировать более чем на {self.MAX_ADVANCE_DAYS} дней вперед"

        # Check 3: During working hours
        if not self._is_time_in_working_hours(producer, scheduled_time):
            return False, "Выбранное время вне рабочих часов"

        # Check 4: Enough preparation time
        delivery_mins = delivery_time_minutes or producer.delivery_time_minutes
        earliest = self._calculate_earliest_possible_time(dish, quantity, delivery_mins)
        if scheduled_time < earliest:
            return False, f"Недостаточно времени на подготовку. Ранее доступное время: {earliest.strftime('%d.%m в %H:%M')}"

        # Check 5: Enough time for seller to accept
        acceptance_cutoff = now + timedelta(hours=self.ACCEPTANCE_BUFFER_HOURS)
        if scheduled_time < acceptance_cutoff:
            return False, "Слишком поздно планировать на это время (минимум 2 часа)"

        # Check 6: Slot capacity
        if producer.max_orders_per_slot > 0:
            slot_start = scheduled_time.replace(minute=(scheduled_time.minute // self.SLOT_INTERVAL_MINUTES) * self.SLOT_INTERVAL_MINUTES, second=0, microsecond=0)
            slot_end = slot_start + timedelta(minutes=self.SLOT_INTERVAL_MINUTES)

            orders_in_slot = Order.objects.filter(
                producer=producer,
                scheduled_delivery_time__gte=slot_start,
                scheduled_delivery_time__lt=slot_end,
                status__in=['WAITING_FOR_PAYMENT', 'PENDING', 'ACCEPTED', 'READY', 'IN_DELIVERY']
            ).count()

            if orders_in_slot >= producer.max_orders_per_slot:
                return False, "Выбранное время уже заполнено. Пожалуйста, выберите другое время"

        return True, ""

    def _get_working_hours_for_date(
        self, producer, target_date: date
    ) -> Optional[Tuple[time, time]]:
        """
        Get working hours for a specific date.
        Checks weekly_schedule first, falls back to opening/closing times.

        Returns:
            (start_time, end_time) or None if closed
        """
        weekday_name = target_date.strftime('%A')  # "Monday", "Tuesday", etc.

        # Check weekly_schedule
        if producer.weekly_schedule:
            for entry in producer.weekly_schedule:
                if entry.get('day') == weekday_name:
                    if entry.get('is_closed', False):
                        return None  # Closed on this day

                    start_str = entry.get('start', '09:00')
                    end_str = entry.get('end', '21:00')

                    start_time = datetime.strptime(start_str, '%H:%M').time()
                    end_time = datetime.strptime(end_str, '%H:%M').time()

                    return start_time, end_time

        # Fallback to default opening/closing times
        return producer.opening_time, producer.closing_time

    def _calculate_earliest_possible_time(
        self, dish, quantity: int, delivery_time_minutes: int
    ) -> datetime:
        """
        Calculate the earliest possible delivery time.

        Formula: now + cooking_time + delivery_time + buffer
        """
        base_time = dish.cooking_time_minutes

        # Apply quantity multiplier (from existing logic)
        if quantity > 1:
            cooking_time = base_time + (base_time * 0.5 * (quantity - 1))
        else:
            cooking_time = base_time

        total_minutes = cooking_time + delivery_time_minutes + self.PREP_BUFFER_MINUTES

        return timezone.now() + timedelta(minutes=total_minutes)

    def _is_time_in_working_hours(self, producer, dt: datetime) -> bool:
        """Check if a datetime falls within working hours."""
        target_date = dt.date()
        working_hours = self._get_working_hours_for_date(producer, target_date)

        if not working_hours:
            return False  # Closed

        start_time, end_time = working_hours
        dt_time = dt.time()

        return start_time <= dt_time <= end_time
