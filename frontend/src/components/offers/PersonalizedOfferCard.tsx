/**
 * Компонент карточки персонализированного предложения.
 * 
 * Обоснование: Индивидуальные скидки и предложения
 * повышают вовлеченность и конверсию пользователей.
 */

import React, { useMemo } from 'react';
import { PersonalizedOffer as PersonalizedOfferType } from '@/lib/api/recommendationApi';

interface PersonalizedOfferCardProps {
  offer: PersonalizedOfferType;
  onActivate: (offerId: string) => void; // eslint-disable-line no-unused-vars
  isActivating?: boolean;
}

export const PersonalizedOfferCard: React.FC<PersonalizedOfferCardProps> = ({
  offer,
  onActivate,
  isActivating = false,
}) => {
  const handleActivate = () => {
    onActivate(offer.id);
  };

  const isExpired = useMemo(() => new Date(offer.valid_until) < new Date(), [offer.valid_until]);
  const daysLeft = useMemo(() => Math.max(0, Math.ceil((new Date(offer.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))), [offer.valid_until]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${isExpired ? 'border-gray-300 opacity-60' : 'border-orange-200'} overflow-hidden`}>
      {/* Header with discount badge */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-white">
            -{offer.discount_percentage}%
          </span>
          {isExpired && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">
              Истекло
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
        <p className="text-sm text-gray-600 mt-2">{offer.description}</p>

        {/* Validity info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {isExpired ? 'Предложение истекло' : `Осталось ${daysLeft} дн.`}
            </span>
          </div>

          {offer.min_order_amount && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Мин. заказ: {offer.min_order_amount.toFixed(2)} ₽</span>
            </div>
          )}

          {offer.applicable_dishes && offer.applicable_dishes.length > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Действует на {offer.applicable_dishes.length} блюд</span>
            </div>
          )}
        </div>

        {/* Activate button */}
        <button
          onClick={handleActivate}
          disabled={!offer.is_active || isExpired || isActivating}
          className={`w-full mt-4 px-4 py-2 rounded-md font-medium transition-colors ${
            !offer.is_active || isExpired
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Активировать предложение"
          type="button"
        >
          {isActivating ? '...' : isExpired ? 'Недоступно' : 'Активировать'}
        </button>
      </div>
    </div>
  );
};
