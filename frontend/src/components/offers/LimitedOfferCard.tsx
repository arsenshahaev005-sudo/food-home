/**
 * Компонент карточки лимитированного предложения.
 * 
 * Обоснование: Лимитированные предложения создают
 * ощущение срочности и стимулируют быструю покупку.
 */

import React from 'react';
import { getFullImageUrl } from '@/lib/api';

export interface LimitedOffer {
  id: string;
  title: string;
  description: string;
  dish: {
    id: string;
    name: string;
    photo: string;
    price: string;
  };
  original_price: string;
  discounted_price: string;
  discount_percentage: number;
  available_quantity: number;
  max_quantity_per_user: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface LimitedOfferCardProps {
  offer: LimitedOffer;
  onActivate?: (offerId: string) => Promise<void>;
  isActivating?: boolean;
}

export const LimitedOfferCard: React.FC<LimitedOfferCardProps> = ({
  offer,
  onActivate,
  isActivating = false,
}) => {
  const handleActivate = async () => {
    if (!onActivate) return;
    try {
      await onActivate(offer.id);
    } catch (error) {
      console.error('Failed to activate offer:', error);
    }
  };

  const isExpired = new Date(offer.end_time) < new Date();
  const isUpcoming = new Date(offer.start_time) > new Date();
  const remainingQuantity = offer.available_quantity;
  const progressPercentage = (remainingQuantity / offer.max_quantity_per_user) * 100;

  const timeLeft = () => {
    const now = new Date();
    const end = new Date(offer.end_time);
    const diffMs = end.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} дн ${diffHours % 24} ч`;
    }
    if (diffHours > 0) {
      return `${diffHours} ч ${diffMins} мин`;
    }
    return `${diffMins} мин`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
      isExpired ? 'border-gray-300 opacity-60' : 'border-red-200'
    }`}>
      {/* Header with discount badge */}
      <div className={`relative ${
        isExpired ? 'bg-gray-100' : 'bg-gradient-to-r from-red-500 to-orange-500'
      } px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${
            isExpired ? 'text-gray-700' : 'text-white'
          }`}>
            {offer.title}
          </h3>
          {!isExpired && (
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-white">
              -{offer.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Dish info */}
        <div className="flex gap-4 mb-4">
          <img
            src={getFullImageUrl(offer.dish.photo)}
            alt={offer.dish.name}
            className="w-24 h-24 object-cover rounded-md"
          />
          <div className="flex-grow">
            <h4 className="font-semibold text-gray-900 mb-1">{offer.dish.name}</h4>
            <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
            
            {/* Price */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${
                isExpired ? 'text-gray-500' : 'text-gray-400 line-through'
              }`}>
                {parseFloat(offer.original_price).toFixed(2)} ₽
              </span>
              <span className={`text-2xl font-bold ${
                isExpired ? 'text-gray-600' : 'text-red-600'
              }`}>
                {parseFloat(offer.discounted_price).toFixed(2)} ₽
              </span>
            </div>

            {/* Quantity progress */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Осталось: {remainingQuantity} из {offer.max_quantity_per_user}</span>
                <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isExpired ? 'bg-gray-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Time info */}
        <div className={`rounded-md p-3 mb-4 ${
          isUpcoming ? 'bg-blue-50' : isExpired ? 'bg-gray-100' : 'bg-yellow-50'
        }`}>
          {isUpcoming && (
            <p className="text-sm text-blue-700">
              ⏰ Начнется: {new Date(offer.start_time).toLocaleString('ru-RU')}
            </p>
          )}
          {isExpired && (
            <p className="text-sm text-gray-600">
              ⏰ Предложение истекло
            </p>
          )}
          {!isUpcoming && !isExpired && (
            <p className="text-sm text-yellow-700">
              ⏰ Осталось: {timeLeft()}
            </p>
          )}
        </div>

        {/* Activate button */}
        {onActivate && !isExpired && (
          <button
            onClick={handleActivate}
            disabled={isActivating || remainingQuantity <= 0}
            className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
              isActivating || remainingQuantity <= 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            aria-label="Активировать предложение"
            type="button"
          >
            {isActivating ? '...' : remainingQuantity <= 0 ? 'Распродано' : 'Активировать'}
          </button>
        )}
      </div>
    </div>
  );
};
