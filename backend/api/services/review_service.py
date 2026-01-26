"""
Сервис для бизнес-логики отзывов.
"""

from django.db.models import Q, Count, Avg, F
from django.utils import timezone
from typing import List, Dict, Optional
import logging

from ..models import Review, Order, Dish, Producer

logger = logging.getLogger(__name__)


class ReviewService:
    """Сервис для управления отзывами."""

    @staticmethod
    def get_reviews_by_producer(producer_id: str, limit: int = 20,
                               sort_by: str = "created_at") -> List[Review]:
        """
        Получить отзывы о производителе.

        Параметры:
        - producer_id: ID производителя
        - limit: максимальное количество отзывов
        - sort_by: критерий сортировки (created_at, rating, helpful)

        Возвращает список отзывов.
        """
        reviews = Review.objects.filter(producer_id=producer_id)

        # Применить сортировку
        if sort_by == "created_at":
            reviews = reviews.order_by('-created_at')
        elif sort_by == "rating":
            reviews = reviews.order_by('-rating_taste', '-rating_appearance', '-rating_service')
        elif sort_by == "helpful":
            # Для сортировки по полезности нужно добавить поле helpful_count
            reviews = reviews.order_by('-created_at')
        else:
            reviews = reviews.order_by('-created_at')

        return reviews.select_related('user', 'order', 'order__dish')[:limit]

    @staticmethod
    def get_reviews_by_dish(dish_id: str, limit: int = 20,
                           sort_by: str = "created_at") -> List[Review]:
        """
        Получить отзывы о блюде.

        Параметры:
        - dish_id: ID блюда
        - limit: максимальное количество отзывов
        - sort_by: критерий сортировки (created_at, rating, helpful)

        Возвращает список отзывов.
        """
        reviews = Review.objects.filter(order__dish_id=dish_id)

        # Применить сортировку
        if sort_by == "created_at":
            reviews = reviews.order_by('-created_at')
        elif sort_by == "rating":
            reviews = reviews.order_by('-rating_taste', '-rating_appearance', '-rating_service')
        elif sort_by == "helpful":
            reviews = reviews.order_by('-created_at')
        else:
            reviews = reviews.order_by('-created_at')

        return reviews.select_related('user', 'order', 'order__dish')[:limit]

    @staticmethod
    def get_detailed_reviews(producer_id: str = None, dish_id: str = None,
                           limit: int = 20, sort_by: str = "created_at") -> List[Dict]:
        """
        Получить детализированные отзывы.

        Возвращает список отзывов с дополнительной информацией.
        """
        if producer_id:
            reviews = Review.objects.filter(producer_id=producer_id)
        elif dish_id:
            reviews = Review.objects.filter(order__dish_id=dish_id)
        else:
            reviews = Review.objects.all()

        # Применить сортировку
        if sort_by == "created_at":
            reviews = reviews.order_by('-created_at')
        elif sort_by == "rating":
            reviews = reviews.order_by('-rating_taste', '-rating_appearance', '-rating_service')
        elif sort_by == "helpful":
            reviews = reviews.order_by('-created_at')
        else:
            reviews = reviews.order_by('-created_at')

        reviews = reviews.select_related('user', 'order', 'order__dish', 'producer')[:limit]

        reviews_data = []
        for review in reviews:
            # Рассчитать среднюю оценку
            ratings = [
                review.rating_taste,
                review.rating_appearance,
                review.rating_service,
                getattr(review, 'rating_portion', 5),
                getattr(review, 'rating_packaging', 5),
            ]
            avg_rating = sum(ratings) / len(ratings)

            reviews_data.append({
                'id': str(review.id),
                'user_email': review.user.email,
                'user_name': f"{review.user.first_name} {review.user.last_name}".strip(),
                'producer_name': review.producer.name,
                'dish_name': review.order.dish.name,
                'dish_photo': review.order.dish.photo,
                'rating_taste': review.rating_taste,
                'rating_appearance': review.rating_appearance,
                'rating_service': review.rating_service,
                'rating_portion': getattr(review, 'rating_portion', 5),
                'rating_packaging': getattr(review, 'rating_packaging', 5),
                'avg_rating': round(avg_rating, 2),
                'comment': review.comment,
                'photo': review.photo,
                'video': getattr(review, 'video', None),
                'seller_response': getattr(review, 'seller_response', None),
                'seller_response_at': getattr(review, 'seller_response_at', None),
                'created_at': review.created_at,
                'updated_at': review.updated_at,
            })

        return reviews_data

    @staticmethod
    def get_producer_statistics(producer_id: str) -> Dict:
        """
        Получить статистику отзывов о производителе.

        Возвращает словарь с информацией о рейтингах.
        """
        reviews = Review.objects.filter(producer_id=producer_id)

        total_reviews = reviews.count()

        if total_reviews == 0:
            return {
                'total_reviews': 0,
                'avg_rating_taste': 0.0,
                'avg_rating_appearance': 0.0,
                'avg_rating_service': 0.0,
                'avg_rating_portion': 0.0,
                'avg_rating_packaging': 0.0,
                'avg_overall_rating': 0.0,
                'reviews_with_photos': 0,
                'reviews_with_videos': 0,
                'reviews_with_responses': 0,
            }

        # Рассчитать средние оценки
        avg_rating_taste = reviews.aggregate(
            avg=Avg('rating_taste')
        )['avg'] or 0.0

        avg_rating_appearance = reviews.aggregate(
            avg=Avg('rating_appearance')
        )['avg'] or 0.0

        avg_rating_service = reviews.aggregate(
            avg=Avg('rating_service')
        )['avg'] or 0.0

        avg_rating_portion = reviews.aggregate(
            avg=Avg('rating_portion')
        )['avg'] or 0.0

        avg_rating_packaging = reviews.aggregate(
            avg=Avg('rating_packaging')
        )['avg'] or 0.0

        # Подсчитать отзывы с фото и видео
        reviews_with_photos = reviews.exclude(photo__isnull=True).count()
        reviews_with_videos = reviews.exclude(video__isnull=True).count()
        reviews_with_responses = reviews.exclude(seller_response__isnull=True).count()

        # Рассчитать общую среднюю оценку
        ratings = [
            avg_rating_taste,
            avg_rating_appearance,
            avg_rating_service,
            avg_rating_portion,
            avg_rating_packaging,
        ]
        avg_overall_rating = sum(ratings) / len(ratings)

        return {
            'total_reviews': total_reviews,
            'avg_rating_taste': round(avg_rating_taste, 2),
            'avg_rating_appearance': round(avg_rating_appearance, 2),
            'avg_rating_service': round(avg_rating_service, 2),
            'avg_rating_portion': round(avg_rating_portion, 2),
            'avg_rating_packaging': round(avg_rating_packaging, 2),
            'avg_overall_rating': round(avg_overall_rating, 2),
            'reviews_with_photos': reviews_with_photos,
            'reviews_with_videos': reviews_with_videos,
            'reviews_with_responses': reviews_with_responses,
        }

    @staticmethod
    def add_seller_response(review_id: str, producer, response: str) -> Review:
        """
        Добавить ответ продавца на отзыв.

        Возвращает обновленный объект Review.
        """
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            raise ValueError(f"Review with id {review_id} not found")

        # Проверить, что отзыв принадлежит этому производителю
        if review.producer != producer:
            raise ValueError("Review does not belong to this producer")

        if review.seller_response:
            raise ValueError("Seller has already responded to this review")

        review.seller_response = response
        review.seller_response_at = timezone.now()
        review.save()

        logger.info(f"Added seller response to review {review_id}")
        return review

    @staticmethod
    def get_user_reviews(user, limit: int = 20) -> List[Review]:
        """
        Получить отзывы пользователя.

        Возвращает список отзывов, созданных пользователем.
        """
        return (
            Review.objects
            .filter(user=user)
            .select_related('order', 'order__dish', 'producer')
            .order_by('-created_at')[:limit]
        )

    @staticmethod
    def can_user_review_order(user, order_id: str) -> bool:
        """
        Проверить, может ли пользователь оставить отзыв на заказ.

        Возвращает True если отзыв возможен, иначе False.
        """
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return False

        # Проверить, что заказ принадлежит пользователю
        if order.user != user:
            return False

        # Проверить, что заказ завершен
        if order.status not in ['COMPLETED', 'DELIVERING', 'ARRIVED']:
            return False

        # Проверить, что отзыв еще не оставлен
        if Review.objects.filter(order=order).exists():
            return False

        return True

    @staticmethod
    def get_recent_reviews(limit: int = 20) -> List[Review]:
        """
        Получить последние отзывы.

        Возвращает список последних отзывов.
        """
        return (
            Review.objects
            .select_related('user', 'order', 'order__dish', 'producer')
            .order_by('-created_at')[:limit]
        )

    @staticmethod
    def request_review_correction(review, producer, refund_amount):
        """
        Продавец предлагает вернуть деньги за исправление оценки.
        Сохранить original_rating_* (если еще не сохранено).
        Установить refund_offered_amount.
        Установить correction_requested_at.
        Отправить уведомление покупателю.
        """
        if review.producer != producer:
            raise ValueError("Review does not belong to this producer")

        if review.is_updated:
            raise ValueError("Review has already been updated")

        # Сохраняем оригинальные рейтинги, если еще не сохранены
        if review.original_rating_taste is None:
            review.original_rating_taste = review.rating_taste
        if review.original_rating_appearance is None:
            review.original_rating_appearance = review.rating_appearance
        if review.original_rating_service is None:
            review.original_rating_service = review.rating_service

        # Устанавливаем сумму возврата
        review.refund_offered_amount = refund_amount
        review.correction_requested_at = timezone.now()
        review.save(
            update_fields=[
                "original_rating_taste",
                "original_rating_appearance",
                "original_rating_service",
                "refund_offered_amount",
                "correction_requested_at",
            ]
        )

        # Отправляем уведомление покупателю
        ReviewService._notify_buyer_about_correction_offer(review)

        logger.info(f"Review correction requested for review {review.id} by producer {producer.id}")
        return review

    @staticmethod
    def accept_review_correction(review, buyer, new_ratings: dict):
        """
        Покупатель принимает предложение и исправляет оценку.
        Проверить что исправление возможно (is_updated == False).
        Обновить рейтинги.
        Установить is_updated = True.
        Установить correction_approved_at.
        Вернуть деньги покупателю.
        Можно исправить только 1 раз.
        """
        if review.user != buyer:
            raise ValueError("Review does not belong to this buyer")

        if review.is_updated:
            raise ValueError("Review has already been updated")

        # Проверяем, что было предложено исправление
        if review.refund_offered_amount is None or review.refund_offered_amount <= 0:
            raise ValueError("No correction offer available")

        # Валидация рейтингов
        for key in ["rating_taste", "rating_appearance", "rating_service"]:
            if key in new_ratings:
                value = new_ratings[key]
                if not isinstance(value, (int, float)) or value < 1 or value > 5:
                    raise ValueError(f"{key} must be between 1 and 5")

        # Обновляем рейтинги
        review.rating_taste = new_ratings.get("rating_taste", review.rating_taste)
        review.rating_appearance = new_ratings.get("rating_appearance", review.rating_appearance)
        review.rating_service = new_ratings.get("rating_service", review.rating_service)

        # Устанавливаем флаги
        review.is_updated = True
        review.refund_accepted = True
        review.correction_approved_at = timezone.now()
        review.save(
            update_fields=[
                "rating_taste",
                "rating_appearance",
                "rating_service",
                "is_updated",
                "refund_accepted",
                "correction_approved_at",
            ]
        )

        # Возвращаем деньги покупателю
        ReviewService._refund_buyer_for_correction(review)

        # Пересчитываем рейтинг магазина
        from .rating_service import RatingService
        rating_service = RatingService()
        rating_service.recalc_for_producer(review.producer)

        logger.info(f"Review correction accepted for review {review.id} by buyer {buyer.id}")
        return review

    @staticmethod
    def reject_review_correction(review, buyer):
        """
        Покупатель отклоняет предложение.
        """
        if review.user != buyer:
            raise ValueError("Review does not belong to this buyer")

        if review.is_updated:
            raise ValueError("Review has already been updated")

        # Просто отмечаем, что предложение отклонено
        review.refund_accepted = False
        review.save(update_fields=["refund_accepted"])

        logger.info(f"Review correction rejected for review {review.id} by buyer {buyer.id}")
        return review

    @staticmethod
    def _notify_buyer_about_correction_offer(review):
        """
        Отправить уведомление покупателю о предложении исправления.
        """
        from .notifications import NotificationService
        notification_service = NotificationService()
        # Создать уведомление для покупателя о предложении исправить отзыв
        if review.order and review.order.user:
            from api.models import Notification
            Notification.objects.create(
                user=review.order.user,
                title="Предложение исправить отзыв",
                message=f"Продавец предложил исправить ваш отзыв с возвратом {review.refund_offered_amount} руб.",
                type="REVIEW",
                link=f"/orders/{review.order.id}/",
            )
        logger.info(f"Notification sent to buyer about correction offer for review {review.id}")

    @staticmethod
    def _refund_buyer_for_correction(review):
        """
        Вернуть деньги покупателю за исправление оценки.
        """
        from .payment_service import PaymentService
        from api.models import Payment

        order = review.order
        payment = order.current_payment

        if not payment:
            # Пробуем найти другой платеж
            payment = order.payments.filter(
                status__in=[
                    Payment.Status.SUCCEEDED,
                    Payment.Status.PARTIALLY_REFUNDED,
                ]
            ).last()

        if payment and review.refund_offered_amount > 0:
            remaining = payment.amount - payment.refunded_amount
            if remaining > 0:
                amount_to_refund = min(remaining, review.refund_offered_amount)
                if amount_to_refund > 0:
                    try:
                        payment_service = PaymentService()
                        payment_service.refund_payment(payment, amount=amount_to_refund)
                        logger.info(f"Refunded {amount_to_refund} to buyer for review correction")
                    except Exception as e:
                        logger.error(f"Failed to refund for review correction {review.id}: {e}")
                        raise  # Перебросить для отката транзакции
