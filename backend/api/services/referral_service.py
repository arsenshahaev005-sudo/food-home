"""
Сервис для управления реферальными бонусами.
"""

from django.db.models import Q, Count, Sum, F
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional
import logging
import secrets
import string

from ..models import Order
from ..models_new import ReferralBonus

logger = logging.getLogger(__name__)


class ReferralService:
    """Сервис для управления реферальной программой."""

    @staticmethod
    def generate_referral_code(length: int = 8) -> str:
        """
        Сгенерировать уникальный реферальный код.

        Возвращает сгенерированный код.
        """
        alphabet = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(alphabet) for _ in range(length))

        # Проверить, что код уникален
        while ReferralBonus.objects.filter(referral_code=code).exists():
            code = ''.join(secrets.choice(alphabet) for _ in range(length))

        return code

    @staticmethod
    def create_referral_bonus(referrer, bonus_amount: Decimal,
                            minimum_order_amount: Decimal = Decimal('0.00'),
                            expires_days: int = 30) -> ReferralBonus:
        """
        Создать реферальный бонус для приглашающего.

        Возвращает созданный объект ReferralBonus.
        """
        referral_code = ReferralService.generate_referral_code()
        expires_at = timezone.now() + timedelta(days=expires_days)

        bonus = ReferralBonus.objects.create(
            referrer=referrer,
            referral_code=referral_code,
            status="PENDING",
            bonus_amount=bonus_amount,
            minimum_order_amount=minimum_order_amount,
            expires_at=expires_at,
        )

        logger.info(
            f"Created referral bonus {referral_code} for user {referrer.email}"
        )
        return bonus

    @staticmethod
    def apply_referral_code(referee, referral_code: str) -> ReferralBonus:
        """
        Применить реферальный код при регистрации.

        Возвращает объект ReferralBonus.
        """
        try:
            bonus = ReferralBonus.objects.get(referral_code=referral_code)
        except ReferralBonus.DoesNotExist:
            raise ValueError(f"Referral code {referral_code} not found")

        # Проверить, что код не истек
        if bonus.expires_at and bonus.expires_at < timezone.now():
            raise ValueError("Referral code has expired")

        # Проверить, что код еще не использован
        if bonus.referee is not None:
            raise ValueError("Referral code has already been used")

        # Привязать реферала
        bonus.referee = referee
        bonus.status = "EARNED"
        bonus.save()

        logger.info(
            f"Applied referral code {referral_code} for user {referee.email}"
        )
        return bonus

    @staticmethod
    def process_referral_earning(referee, order_amount: Decimal) -> Optional[ReferralBonus]:
        """
        Обработать получение реферального бонуса после заказа.

        Возвращает объект ReferralBonus если бонус был заработан, иначе None.
        """
        # Найти реферальный бонус пользователя
        bonus = ReferralBonus.objects.filter(
            referee=referee,
            status="EARNED"
        ).first()

        if not bonus:
            return None

        # Проверить, выполнены ли условия получения бонуса
        if order_amount < bonus.minimum_order_amount:
            return None

        # Проверить, что бонус еще не выплачен
        if bonus.status == "PAID":
            return None

        # Проверить, что бонус не истек
        if bonus.expires_at and bonus.expires_at < timezone.now():
            bonus.status = "EXPIRED"
            bonus.save()
            return None

        # Начислить бонус
        bonus.status = "PAID"
        bonus.paid_at = timezone.now()
        bonus.save()

        # Начислить бонус на баланс приглашающего
        referrer = bonus.referrer
        from ..models import Producer
        producer = Producer.objects.filter(user=referrer).first()
        if producer:
            producer.balance += bonus.bonus_amount
            producer.save()

        logger.info(
            f"Processed referral earning {bonus.referral_code} for {referrer.email}"
        )
        return bonus

    @staticmethod
    def get_user_referral_bonuses(user, status: str = None) -> List[ReferralBonus]:
        """
        Получить реферальные бонусы пользователя.

        Возвращает список бонусов, отфильтрованных по статусу.
        """
        bonuses = ReferralBonus.objects.filter(referrer=user)

        if status:
            bonuses = bonuses.filter(status=status)

        return bonuses.order_by('-created_at')

    @staticmethod
    def get_referral_statistics(user) -> Dict:
        """
        Получить статистику реферальной программы пользователя.

        Возвращает словарь с информацией о рефералах.
        """
        bonuses = ReferralBonus.objects.filter(referrer=user)

        total_bonuses = bonuses.count()
        pending_bonuses = bonuses.filter(status="PENDING").count()
        earned_bonuses = bonuses.filter(status="EARNED").count()
        paid_bonuses = bonuses.filter(status="PAID").count()
        expired_bonuses = bonuses.filter(status="EXPIRED").count()

        # Рассчитать общую сумму выплаченных бонусов
        total_earned = bonuses.filter(status="PAID").aggregate(
            total=Sum('bonus_amount')
        )['total'] or Decimal('0.00')

        return {
            'total_bonuses': total_bonuses,
            'pending_bonuses': pending_bonuses,
            'earned_bonuses': earned_bonuses,
            'paid_bonuses': paid_bonuses,
            'expired_bonuses': expired_bonuses,
            'total_earned': float(total_earned),
        }

    @staticmethod
    def get_referral_link(referral_code: str, base_url: str) -> str:
        """
        Сгенерировать реферальную ссылку.

        Возвращает URL с реферальным кодом.
        """
        return f"{base_url}?referral={referral_code}"

    @staticmethod
    def check_referral_code_validity(referral_code: str) -> Dict:
        """
        Проверить валидность реферального кода.

        Возвращает словарь с информацией о коде.
        """
        try:
            bonus = ReferralBonus.objects.get(referral_code=referral_code)
        except ReferralBonus.DoesNotExist:
            return {
                'valid': False,
                'reason': 'Code not found',
            }

        # Проверить, что код не истек
        if bonus.expires_at and bonus.expires_at < timezone.now():
            return {
                'valid': False,
                'reason': 'Code has expired',
            }

        # Проверить, что код еще не использован
        if bonus.referee is not None:
            return {
                'valid': False,
                'reason': 'Code has already been used',
            }

        return {
            'valid': True,
            'bonus_amount': float(bonus.bonus_amount),
            'minimum_order_amount': float(bonus.minimum_order_amount),
        }

    @staticmethod
    def expire_old_bonuses() -> int:
        """
        Отметить истекшие реферальные бонусы.

        Возвращает количество обновленных бонусов.
        """
        now = timezone.now()

        count = ReferralBonus.objects.filter(
            status="EARNED",
            expires_at__lt=now
        ).update(status="EXPIRED")

        logger.info(f"Expired {count} old referral bonuses")
        return count
