"""
Сервис для генерации рекомендаций на основе поведения пользователя.
"""

import logging
from typing import Dict, List

from django.db.models import Avg, Count, Q
from django.utils import timezone

from ..models import Dish, Order, Producer
from ..models_new import Recommendation

logger = logging.getLogger(__name__)


class RecommendationService:
    """Сервис для генерации рекомендаций."""

    @staticmethod
    def generate_order_history_recommendations(user, limit: int = 10) -> List[Dict]:
        """
        Генерировать рекомендации на основе истории заказов.

        Рекомендует блюда из категорий, которые пользователь часто заказывал.
        """
        # Получить категории, которые пользователь часто заказывал
        ordered_categories = (
            Order.objects
            .filter(user=user, status__in=['COMPLETED', 'DELIVERING'])
            .values('dish__category')
            .annotate(order_count=Count('id'))
            .order_by('-order_count')[:5]
        )

        category_ids = [item['dish__category'] for item in ordered_categories if item['dish__category']]

        if not category_ids:
            return []

        # Получить популярные блюда из этих категорий
        recommended_dishes = (
            Dish.objects
            .filter(
                category_id__in=category_ids,
                is_available=True,
                is_archived=False,
            )
            .exclude(id__in=Order.objects.filter(user=user).values_list('dish_id', flat=True))
            .annotate(
                order_count=Count('orders'),
                avg_rating=Avg('rating')
            )
            .order_by('-order_count', '-avg_rating')[:limit]
        )

        recommendations = []
        for dish in recommended_dishes:
            score = RecommendationService._calculate_order_history_score(dish)
            recommendations.append({
                'dish': dish,
                'recommendation_type': 'ORDER_HISTORY',
                'score': score,
                'reason': f"Based on your orders from {dish.category.name}",
            })

        return recommendations

    @staticmethod
    def generate_similar_items_recommendations(user, dish_id: str, limit: int = 5) -> List[Dict]:
        """
        Генерировать рекомендации "похожие товары".

        Рекомендует блюда из той же категории или того же производителя.
        """
        try:
            base_dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return []

        # Получить похожие блюда из той же категории
        similar_dishes = (
            Dish.objects
            .filter(
                category=base_dish.category,
                is_available=True,
                is_archived=False,
            )
            .exclude(id=base_dish.id)
            .exclude(id__in=Order.objects.filter(user=user).values_list('dish_id', flat=True))
            .annotate(
                order_count=Count('orders'),
                avg_rating=Avg('rating')
            )
            .order_by('-order_count', '-avg_rating')[:limit]
        )

        recommendations = []
        for dish in similar_dishes:
            score = RecommendationService._calculate_similarity_score(base_dish, dish)
            recommendations.append({
                'dish': dish,
                'recommendation_type': 'SIMILAR_ITEMS',
                'score': score,
                'reason': f"Similar to {base_dish.name}",
            })

        return recommendations

    @staticmethod
    def generate_frequently_bought_together_recommendations(user, dish_id: str, limit: int = 5) -> List[Dict]:
        """
        Генерировать рекомендации "часто покупают вместе".

        Рекомендует блюда, которые часто покупают вместе с данным блюдом.
        """
        try:
            base_dish = Dish.objects.get(id=dish_id)
        except Dish.DoesNotExist:
            return []

        # Найти заказы, которые содержат это блюдо
        order_ids = (
            Order.objects
            .filter(dish=base_dish, status__in=['COMPLETED', 'DELIVERING'])
            .values_list('id', flat=True)
        )

        if not order_ids:
            return []

        # Найти другие блюда в тех же заказах
        frequently_bought_dishes = (
            Dish.objects
            .filter(orders__id__in=order_ids)
            .exclude(id=base_dish.id)
            .annotate(
                order_count=Count('orders')
            )
            .order_by('-order_count')[:limit]
        )

        recommendations = []
        for dish in frequently_bought_dishes:
            score = RecommendationService._calculate_frequently_bought_score(dish)
            recommendations.append({
                'dish': dish,
                'recommendation_type': 'FREQUENTLY_BOUGHT',
                'score': score,
                'reason': "Frequently bought together",
            })

        return recommendations

    @staticmethod
    def generate_seasonal_recommendations(user, limit: int = 10) -> List[Dict]:
        """
        Генерировать сезонные рекомендации.

        Рекомендует блюда, популярные в текущем сезоне.
        """
        current_month = timezone.now().month

        # Определить сезон
        if current_month in [12, 1, 2]:
            season = "winter"
            season_keywords = ["тепл", "горяч", "суп", "печен"]
        elif current_month in [3, 4, 5]:
            season = "spring"
            season_keywords = ["свеж", "зелен", "весен"]
        elif current_month in [6, 7, 8]:
            season = "summer"
            season_keywords = ["холод", "освеж", "лет"]
        else:
            season = "autumn"
            season_keywords = ["урожай", "осен", "тепл"]

        # Поиск блюд с сезонными ключевыми словами
        seasonal_dishes = (
            Dish.objects
            .filter(
                is_available=True,
                is_archived=False,
            )
            .filter(
                Q(name__icontains=season_keywords[0]) |
                Q(description__icontains=season_keywords[0]) |
                Q(name__icontains=season_keywords[1]) |
                Q(description__icontains=season_keywords[1])
            )
            .exclude(id__in=Order.objects.filter(user=user).values_list('dish_id', flat=True))
            .annotate(
                order_count=Count('orders'),
                avg_rating=Avg('rating')
            )
            .order_by('-order_count', '-avg_rating')[:limit]
        )

        recommendations = []
        for dish in seasonal_dishes:
            score = RecommendationService._calculate_seasonal_score(dish, season)
            recommendations.append({
                'dish': dish,
                'recommendation_type': 'SEASONAL',
                'score': score,
                'reason': f"Perfect for {season} season",
            })

        return recommendations

    @staticmethod
    def generate_location_based_recommendations(user, limit: int = 10) -> List[Dict]:
        """
        Генерировать рекомендации на основе локации.

        Рекомендует блюда от местных производителей.
        """
        # Получить город пользователя из профиля или последнего заказа
        user_city = None
        last_order = Order.objects.filter(user=user).order_by('-created_at').first()
        if last_order:
            user_city = last_order.dish.producer.city

        if not user_city:
            return []

        # Получить производителей из этого города
        local_producers = Producer.objects.filter(city=user_city, is_hidden=False)

        if not local_producers.exists():
            return []

        # Получить популярные блюда от местных производителей
        local_dishes = (
            Dish.objects
            .filter(
                producer__in=local_producers,
                is_available=True,
                is_archived=False,
            )
            .exclude(id__in=Order.objects.filter(user=user).values_list('dish_id', flat=True))
            .annotate(
                order_count=Count('orders'),
                avg_rating=Avg('rating')
            )
            .order_by('-order_count', '-avg_rating')[:limit]
        )

        recommendations = []
        for dish in local_dishes:
            score = RecommendationService._calculate_location_score(dish, user_city)
            recommendations.append({
                'dish': dish,
                'recommendation_type': 'LOCATION_BASED',
                'score': score,
                'reason': f"From local producer in {user_city}",
            })

        return recommendations

    @staticmethod
    def save_recommendations(user, recommendations: List[Dict]) -> int:
        """
        Сохранить рекомендации в базу данных.

        Возвращает количество сохраненных рекомендаций.
        """
        saved_count = 0
        for rec in recommendations:
            # Проверить, существует ли уже такая рекомендация
            exists = Recommendation.objects.filter(
                user=user,
                dish=rec['dish'],
                recommendation_type=rec['recommendation_type']
            ).exists()

            if not exists:
                Recommendation.objects.create(
                    user=user,
                    dish=rec['dish'],
                    recommendation_type=rec['recommendation_type'],
                    score=rec['score'],
                    reason=rec['reason'],
                )
                saved_count += 1

        logger.info(f"Saved {saved_count} recommendations for user {user.email}")
        return saved_count

    @staticmethod
    def get_user_recommendations(user, limit: int = 20) -> List[Recommendation]:
        """
        Получить рекомендации для пользователя.

        Возвращает несмотренные рекомендации, отсортированные по релевантности.
        """
        return (
            Recommendation.objects
            .filter(user=user, is_shown=False)
            .select_related('dish', 'dish__producer', 'dish__category')
            .order_by('-score', '-created_at')[:limit]
        )

    @staticmethod
    def mark_recommendations_as_shown(user, recommendation_ids: List[str]) -> int:
        """
        Отметить рекомендации как просмотренные.

        Возвращает количество обновленных рекомендаций.
        """
        count = Recommendation.objects.filter(
            user=user,
            id__in=recommendation_ids
        ).update(is_shown=True)

        logger.info(f"Marked {count} recommendations as shown for user {user.email}")
        return count

    @staticmethod
    def mark_recommendation_as_clicked(user, recommendation_id: str) -> bool:
        """
        Отметить рекомендацию как кликнутую.

        Возвращает True если рекомендация была обновлена.
        """
        try:
            rec = Recommendation.objects.get(id=recommendation_id, user=user)
            rec.is_shown = True
            rec.is_clicked = True
            rec.save()
            logger.info(f"Marked recommendation {recommendation_id} as clicked for user {user.email}")
            return True
        except Recommendation.DoesNotExist:
            return False

    @staticmethod
    def _calculate_order_history_score(dish: Dish) -> float:
        """Рассчитать релевантность для рекомендаций на основе истории заказов."""
        base_score = 50.0

        # Бонус за популярность
        base_score += min(dish.order_count * 2, 30.0)

        # Бонус за рейтинг
        base_score += min((dish.avg_rating or 0) * 5, 20.0)

        return base_score

    @staticmethod
    def _calculate_similarity_score(base_dish: Dish, similar_dish: Dish) -> float:
        """Рассчитать релевантность для похожих товаров."""
        base_score = 40.0

        # Бонус за ту же категорию
        if base_dish.category == similar_dish.category:
            base_score += 20.0

        # Бонус за того же производителя
        if base_dish.producer == similar_dish.producer:
            base_score += 15.0

        # Бонус за схожую цену
        price_diff = abs(float(base_dish.price) - float(similar_dish.price))
        if price_diff < 100:
            base_score += 10.0
        elif price_diff < 200:
            base_score += 5.0

        return base_score

    @staticmethod
    def _calculate_frequently_bought_score(dish: Dish) -> float:
        """Рассчитать релевантность для часто покупаемых вместе товаров."""
        base_score = 45.0

        # Бонус за количество совместных заказов
        base_score += min(dish.order_count * 3, 35.0)

        # Бонус за рейтинг
        base_score += min((dish.avg_rating or 0) * 5, 20.0)

        return base_score

    @staticmethod
    def _calculate_seasonal_score(dish: Dish, season: str) -> float:
        """Рассчитать релевантность для сезонных рекомендаций."""
        base_score = 35.0

        # Бонус за популярность
        base_score += min(dish.order_count * 2, 30.0)

        # Бонус за рейтинг
        base_score += min((dish.avg_rating or 0) * 5, 25.0)

        return base_score

    @staticmethod
    def _calculate_location_score(dish: Dish, city: str) -> float:
        """Рассчитать релевантность для локационных рекомендаций."""
        base_score = 30.0

        # Бонус за популярность
        base_score += min(dish.order_count * 2, 40.0)

        # Бонус за рейтинг
        base_score += min((dish.avg_rating or 0) * 5, 30.0)

        return base_score
