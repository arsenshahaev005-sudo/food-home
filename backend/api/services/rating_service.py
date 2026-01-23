from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from django.db import transaction
from django.utils import timezone

from api.models import Producer, Review, Order, Dish, Dispute


@dataclass
class RatingConfig:
    base_score: float = 4.7
    min_reviews: int = 10
    weight_taste: float = 0.5
    weight_appearance: float = 0.2
    weight_service: float = 0.3
    penalty_per_point: float = 0.05
    rating_window_days: int = 90
    sla_late_threshold: float = 0.1
    sla_alpha: float = 2.0
    dispute_rate_threshold: float = 0.05
    dispute_lost_threshold: float = 0.8
    dispute_gamma: float = 3.0
    dispute_delta: float = 2.0
    weight_review_factor: float = 0.6
    weight_sla_factor: float = 0.2
    weight_dispute_factor: float = 0.2
    dish_weight_taste: float = 0.7
    dish_weight_appearance: float = 0.3


class RatingService:
    def __init__(self, config: Optional[RatingConfig] = None):
        self.config = config or RatingConfig()

    def _now(self):
        return timezone.now()

    def _review_score(self, review: Review) -> float:
        total_weight = (
            self.config.weight_taste
            + self.config.weight_appearance
            + self.config.weight_service
        )
        score = (
            self.config.weight_taste * review.rating_taste
            + self.config.weight_appearance * review.rating_appearance
            + self.config.weight_service * review.rating_service
        ) / total_weight
        if review.refund_accepted:
            score = min(score, 3.0)
        return score

    def _dish_review_score(self, review: Review) -> float:
        total_weight = self.config.dish_weight_taste + self.config.dish_weight_appearance
        if total_weight <= 0:
            return 0.0
        return (
            self.config.dish_weight_taste * review.rating_taste
            + self.config.dish_weight_appearance * review.rating_appearance
        ) / total_weight

    def _review_weight(self, review: Review) -> float:
        age_days = (self._now() - review.created_at).days
        if age_days <= 30:
            return 1.0
        if age_days <= 90:
            return 0.7
        return 0.4

    def _aggregate_reviews(self, qs):
        count = qs.count()
        if count == 0:
            return 0.0, 0
        weighted_sum = 0.0
        weight_total = 0.0
        for r in qs:
            w = self._review_weight(r)
            weighted_sum += self._review_score(r) * w
            weight_total += w
        if weight_total == 0:
            return 0.0, count
        return weighted_sum / weight_total, count

    def _aggregate_dish_reviews(self, qs):
        count = qs.count()
        if count == 0:
            return 0.0, 0
        weighted_sum = 0.0
        weight_total = 0.0
        for r in qs:
            w = self._review_weight(r)
            weighted_sum += self._dish_review_score(r) * w
            weight_total += w
        if weight_total == 0:
            return 0.0, count
        return weighted_sum / weight_total, count

    def _apply_bayesian_smoothing(self, raw_rating: float, count: int) -> float:
        m = self.config.min_reviews
        C = self.config.base_score
        return (C * m + raw_rating * count) / (m + count)

    def _apply_penalties(self, rating: float, producer: Producer) -> float:
        penalty_points = getattr(producer, "penalty_points", 0) or 0
        penalty_delta = penalty_points * self.config.penalty_per_point
        value = rating - penalty_delta
        if value < 1.0:
            value = 1.0
        if value > 5.0:
            value = 5.0
        return value

    def _calc_sla_score(self, producer: Producer) -> float:
        window_start = self._now() - timedelta(days=self.config.rating_window_days)
        orders = (
            Order.objects.filter(producer=producer, created_at__gte=window_start)
            .filter(status__in=["COMPLETED", "CANCELLED"])
        )
        total = orders.count()
        if total == 0:
            return 1.0
        sla_cancelled = orders.filter(status="CANCELLED", cancelled_by="SYSTEM").count()
        violation_rate = sla_cancelled / total
        threshold = self.config.sla_late_threshold
        violation_rate = min(violation_rate, threshold)
        score = 1.0 - self.config.sla_alpha * violation_rate
        if score < 0.0:
            score = 0.0
        if score > 1.0:
            score = 1.0
        return score

    def _calc_dispute_score(self, producer: Producer) -> float:
        window_start = self._now() - timedelta(days=self.config.rating_window_days)
        orders_total = (
            Order.objects.filter(producer=producer, created_at__gte=window_start)
            .filter(status__in=["COMPLETED", "CANCELLED"])
            .count()
        )
        if orders_total == 0:
            return 1.0
        disputes = Dispute.objects.filter(
            order__producer=producer, created_at__gte=window_start
        )
        total = disputes.count()
        if total == 0:
            return 1.0
        lost = disputes.filter(status="RESOLVED_BUYER_WON").count()
        dispute_rate = total / orders_total
        lost_rate = lost / total if total > 0 else 0.0
        dispute_rate = min(dispute_rate, self.config.dispute_rate_threshold)
        lost_rate = min(lost_rate, self.config.dispute_lost_threshold)
        score = (
            1.0
            - self.config.dispute_gamma * dispute_rate
            - self.config.dispute_delta * lost_rate
        )
        if score < 0.0:
            score = 0.0
        if score > 1.0:
            score = 1.0
        return score

    def _combine_producer_rating(
        self,
        review_rating: float,
        sla_score: float,
        dispute_score: float,
    ) -> float:
        factor = (
            self.config.weight_review_factor
            + self.config.weight_sla_factor * sla_score
            + self.config.weight_dispute_factor * dispute_score
        )
        return review_rating * factor

    @transaction.atomic
    def recalc_for_producer(self, producer: Producer) -> Producer:
        reviews_qs = Review.objects.filter(producer=producer)
        raw_rating, count = self._aggregate_reviews(reviews_qs)
        if count == 0:
            producer.rating = 0
            producer.rating_count = 0
            producer.save(update_fields=["rating", "rating_count"])
            return producer
        smoothed = self._apply_bayesian_smoothing(raw_rating, count)
        sla_score = self._calc_sla_score(producer)
        dispute_score = self._calc_dispute_score(producer)
        combined = self._combine_producer_rating(smoothed, sla_score, dispute_score)
        final_rating = self._apply_penalties(combined, producer)
        producer.rating = final_rating
        producer.rating_count = count
        producer.save(update_fields=["rating", "rating_count"])
        return producer

    @transaction.atomic
    def recalc_for_dish(self, dish: Dish) -> Dish:
        reviews_qs = Review.objects.filter(order__dish=dish)
        raw_rating, count = self._aggregate_dish_reviews(reviews_qs)
        if count == 0:
            dish.rating = 0
            dish.rating_count = 0
            producer_rating = float(getattr(dish.producer, "rating", 0) or 0)
            dish.sort_score = producer_rating
            dish.save(update_fields=["rating", "rating_count", "sort_score"])
            return dish
        smoothed = self._apply_bayesian_smoothing(raw_rating, count)
        producer_rating = float(getattr(dish.producer, "rating", 0) or 0)
        sort_score = 0.7 * smoothed + 0.3 * producer_rating
        dish.rating = smoothed
        dish.rating_count = count
        dish.sort_score = sort_score
        dish.save(update_fields=["rating", "rating_count", "sort_score"])
        return dish

    @transaction.atomic
    def recalc_for_order(self, order: Order):
        dish = getattr(order, "dish", None)
        producer = order.producer or getattr(order.dish, "producer", None)
        updated_producer = None
        if producer:
            updated_producer = self.recalc_for_producer(producer)
        if dish:
            if updated_producer and dish.producer_id == updated_producer.id:
                dish.producer = updated_producer
            self.recalc_for_dish(dish)
        return updated_producer

    def get_cached_rating(self, producer: Producer) -> float:
        value = getattr(producer, "rating", 0) or 0
        return float(value)
