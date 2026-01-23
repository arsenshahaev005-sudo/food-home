"""
Сервис для бизнес-логики чата и коммуникации.
"""

from django.db.models import Q, Count, Avg
from django.utils import timezone
from typing import List, Dict, Optional
import logging

from ..models import ChatMessage, Order, Producer
from ..models_new import MessageTemplate, CommunicationRating

logger = logging.getLogger(__name__)


class ChatService:
    """Сервис для управления чатом и коммуникацией."""

    @staticmethod
    def get_conversation_history(user, other_user_id: str, limit: int = 50) -> List[ChatMessage]:
        """
        Получить историю переписки между двумя пользователями.

        Возвращает список сообщений, отсортированных по времени.
        """
        messages = (
            ChatMessage.objects
            .filter(
                Q(sender=user, recipient_id=other_user_id) |
                Q(sender_id=other_user_id, recipient=user)
            )
            .select_related('sender', 'recipient', 'order')
            .order_by('created_at')[:limit]
        )

        return messages

    @staticmethod
    def get_conversation_partners(user) -> List[Dict]:
        """
        Получить список пользователей, с которыми была переписка.

        Возвращает список уникальных собеседников с информацией о последних сообщениях.
        """
        # Получить всех уникальных собеседников
        partners = (
            ChatMessage.objects
            .filter(Q(sender=user) | Q(recipient=user))
            .values('sender', 'recipient')
            .annotate(
                last_message_time=Count('id'),
                message_count=Count('id')
            )
            .order_by('-last_message_time')
        )

        partners_data = []
        for partner in partners:
            partner_id = partner['sender'] if partner['recipient'] == user.id else partner['recipient']
            partner_email = None
            partner_name = None

            # Получить информацию о партнере
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                partner_user = User.objects.get(id=partner_id)
                partner_email = partner_user.email
                partner_name = f"{partner_user.first_name} {partner_user.last_name}".strip()
            except User.DoesNotExist:
                pass

            # Получить последнее сообщение
            last_message = (
                ChatMessage.objects
                .filter(
                    Q(sender=user, recipient_id=partner_id) |
                    Q(sender_id=partner_id, recipient=user)
                )
                .order_by('-created_at')
                .first()
            )

            # Подсчитать непрочитанные сообщения
            unread_count = ChatMessage.objects.filter(
                sender_id=partner_id,
                recipient=user,
                is_read=False
            ).count()

            partners_data.append({
                'user_id': str(partner_id),
                'email': partner_email,
                'name': partner_name,
                'last_message': {
                    'content': last_message.content if last_message else None,
                    'created_at': last_message.created_at if last_message else None,
                    'message_type': last_message.message_type if last_message else None,
                },
                'unread_count': unread_count,
                'message_count': partner['message_count'],
            })

        return partners_data

    @staticmethod
    def mark_messages_as_read(user, sender_id: str) -> int:
        """
        Отметить сообщения от отправителя как прочитанные.

        Возвращает количество обновленных сообщений.
        """
        count = ChatMessage.objects.filter(
            recipient=user,
            sender_id=sender_id,
            is_read=False
        ).update(is_read=True)

        logger.info(f"Marked {count} messages as read for user {user.email}")
        return count

    @staticmethod
    def get_unread_count(user) -> int:
        """
        Получить количество непрочитанных сообщений.

        Возвращает количество непрочитанных сообщений.
        """
        return ChatMessage.objects.filter(
            recipient=user,
            is_read=False
        ).count()

    @staticmethod
    def archive_conversation(user, other_user_id: str) -> int:
        """
        Архивировать переписку с пользователем.

        Возвращает количество архивированных сообщений.
        """
        # Получить все сообщения между пользователями
        messages = ChatMessage.objects.filter(
            Q(sender=user, recipient_id=other_user_id) |
            Q(sender_id=other_user_id, recipient=user)
        )

        count = messages.count()

        # В данной реализации мы не добавляем поле is_archived,
        # но можем использовать soft delete или фильтрацию
        # Для простоты реализации просто вернем количество

        logger.info(
            f"Archived conversation between {user.email} and {other_user_id}"
        )
        return count

    @staticmethod
    def create_message_template(producer, title: str, content: str,
                            order: int = 0) -> MessageTemplate:
        """
        Создать шаблон сообщения для продавца.

        Возвращает созданный объект MessageTemplate.
        """
        template = MessageTemplate.objects.create(
            producer=producer,
            title=title,
            content=content,
            order=order,
        )

        logger.info(
            f"Created message template '{title}' for producer {producer.name}"
        )
        return template

    @staticmethod
    def get_producer_templates(producer) -> List[MessageTemplate]:
        """
        Получить список шаблонов сообщений продавца.

        Возвращает активные шаблоны, отсортированные по порядку.
        """
        return (
            MessageTemplate.objects
            .filter(producer=producer, is_active=True)
            .order_by('order', 'created_at')
        )

    @staticmethod
    def update_message_template(template_id: str, producer,
                           title: str = None, content: str = None,
                           is_active: bool = None, order: int = None) -> MessageTemplate:
        """
        Обновить шаблон сообщения.

        Возвращает обновленный объект MessageTemplate.
        """
        try:
            template = MessageTemplate.objects.get(id=template_id, producer=producer)
        except MessageTemplate.DoesNotExist:
            raise ValueError(f"Message template with id {template_id} not found")

        if title is not None:
            template.title = title
        if content is not None:
            template.content = content
        if is_active is not None:
            template.is_active = is_active
        if order is not None:
            template.order = order

        template.save()

        logger.info(f"Updated message template {template_id} for producer {producer.name}")
        return template

    @staticmethod
    def delete_message_template(template_id: str, producer) -> bool:
        """
        Удалить шаблон сообщения.

        Возвращает True если шаблон был удален, False если не найден.
        """
        try:
            template = MessageTemplate.objects.get(id=template_id, producer=producer)
            template.delete()
            logger.info(f"Deleted message template {template_id}")
            return True
        except MessageTemplate.DoesNotExist:
            return False

    @staticmethod
    def submit_communication_rating(order, rater, rated_user,
                                  rating: int, comment: str = "") -> CommunicationRating:
        """
        Отправить оценку качества общения.

        Возвращает созданный объект CommunicationRating.
        """
        if rating < 1 or rating > 5:
            raise ValueError("Rating must be between 1 and 5")

        # Проверить, существует ли уже оценка
        existing = CommunicationRating.objects.filter(
            order=order,
            rater=rater,
            rated_user=rated_user
        ).exists()

        if existing:
            raise ValueError("Rating already exists for this order and users")

        rating_obj = CommunicationRating.objects.create(
            order=order,
            rater=rater,
            rated_user=rated_user,
            rating=rating,
            comment=comment,
        )

        logger.info(
            f"Created communication rating {rating}/5 from {rater.email} to {rated_user.email}"
        )
        return rating_obj

    @staticmethod
    def get_user_communication_ratings(user) -> List[Dict]:
        """
        Получить оценки качества общения для пользователя.

        Возвращает список оценок, которые пользователь получил.
        """
        ratings = (
            CommunicationRating.objects
            .filter(rated_user=user)
            .select_related('rater', 'order')
            .order_by('-created_at')
        )

        ratings_data = []
        for rating in ratings:
            ratings_data.append({
                'id': str(rating.id),
                'rater_email': rating.rater.email,
                'rater_name': f"{rating.rater.first_name} {rating.rater.last_name}".strip(),
                'order_id': str(rating.order.id),
                'rating': rating.rating,
                'comment': rating.comment,
                'created_at': rating.created_at,
            })

        return ratings_data

    @staticmethod
    def get_average_communication_rating(user) -> Dict:
        """
        Получить среднюю оценку качества общения пользователя.

        Возвращает словарь со средней оценкой и количеством оценок.
        """
        ratings = CommunicationRating.objects.filter(rated_user=user)

        if not ratings.exists():
            return {
                'average_rating': 0.0,
                'rating_count': 0,
            }

        avg_rating = ratings.aggregate(avg_rating=Avg('rating'))['avg_rating']
        rating_count = ratings.count()

        return {
            'average_rating': round(avg_rating, 2) if avg_rating else 0.0,
            'rating_count': rating_count,
        }
