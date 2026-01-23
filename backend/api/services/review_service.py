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
