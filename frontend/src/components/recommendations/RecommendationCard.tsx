/**
 * Компонент карточки рекомендации.
 * 
 * Обоснование: Карточки рекомендаций с понятным обоснованием
 * (почему этот товар рекомендован) повышают доверие пользователей
 * и вероятность клика.
 */

import React from 'react';
import Link from 'next/link';
import { getFullImageUrl } from '@/lib/api';
import { Recommendation as RecommendationType } from '@/lib/api/recommendationApi';

interface RecommendationCardProps {
  recommendation: RecommendationType;
  onMarkAsClicked: (_recommendationId: string) => void; // eslint-disable-line no-unused-vars
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onMarkAsClicked,
}) => {
  const handleClick = () => {
    onMarkAsClicked(recommendation.id);
  };

  const getRecommendationTypeLabel = (type: string): string => {
    switch (type) {
      case 'ORDER_HISTORY':
        return 'На основе ваших заказов';
      case 'SIMILAR_ITEMS':
        return 'Похожий товар';
      case 'FREQUENTLY_BOUGHT':
        return 'Часто покупают вместе';
      case 'SEASONAL':
        return 'Сезонное предложение';
      case 'LOCATION_BASED':
        return 'От местных производителей';
      default:
        return 'Рекомендация';
    }
  };

  const getRecommendationTypeColor = (type: string): string => {
    switch (type) {
      case 'ORDER_HISTORY':
        return 'bg-blue-100 text-blue-800';
      case 'SIMILAR_ITEMS':
        return 'bg-purple-100 text-purple-800';
      case 'FREQUENTLY_BOUGHT':
        return 'bg-green-100 text-green-800';
      case 'SEASONAL':
        return 'bg-orange-100 text-orange-800';
      case 'LOCATION_BASED':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link
      href={`/dishes/${recommendation.dish.id}`}
      onClick={handleClick}
      className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="relative">
        {/* Dish Image */}
        <div className="aspect-square overflow-hidden rounded-t-lg">
          <img
            src={getFullImageUrl(recommendation.dish.photo)}
            alt={recommendation.dish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Recommendation Type Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecommendationTypeColor(recommendation.recommendation_type)}`}>
            {getRecommendationTypeLabel(recommendation.recommendation_type)}
          </span>
        </div>

        {/* Rating Badge */}
        {recommendation.dish.rating && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <span className="text-sm font-semibold text-yellow-600">
              ⭐ {recommendation.dish.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Dish Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
          {recommendation.dish.name}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {recommendation.dish.producer.name}
        </p>
        
        {/* Reason */}
        <p className="text-xs text-gray-500 mt-2 italic">
          {recommendation.reason}
        </p>

        {/* Price and Cooking Time */}
        <div className="flex items-center justify-between mt-3">
          <p className="font-semibold text-gray-900">
            {parseFloat(recommendation.dish.price).toFixed(2)} ₽
          </p>
          {recommendation.dish.cooking_time_minutes > 0 && (
            <p className="text-xs text-gray-500">
              ⏱ {recommendation.dish.cooking_time_minutes} мин
            </p>
          )}
        </div>

        {/* Score Badge (for debugging or advanced users) */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Релевантность: {recommendation.score.toFixed(0)}%
          </span>
        </div>
      </div>
    </Link>
  );
};
