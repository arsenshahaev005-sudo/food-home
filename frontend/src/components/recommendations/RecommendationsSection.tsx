/**
 * Секция рекомендаций.
 * 
 * Обоснование: Секция рекомендаций с различными типами
 * (на основе истории, похожие товары, часто покупают вместе)
 * помогает пользователям открывать для себя новые блюда.
 */

import React, { useEffect, useState } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { Recommendation } from '@/lib/api/recommendationApi';

interface RecommendationsSectionProps {
  token: string;
  title?: string;
  limit?: number;
  recommendationType?: 'all' | 'order-history' | 'similar-items' | 'seasonal';
  dishId?: string;
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  token,
  title = 'Рекомендации для вас',
  limit = 8,
  recommendationType = 'all',
  dishId,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Здесь будет вызов API для получения рекомендаций
      // Временная заглушка для демонстрации
      setRecommendations([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsClicked = async (recommendationId: string) => {
    try {
      // Здесь будет вызов API для отметки рекомендации как кликнутой
      console.log('Marking recommendation as clicked:', recommendationId);
    } catch (err) {
      console.error('Failed to mark recommendation as clicked:', err);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [token, recommendationType, dishId]);

  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg animate-pulse h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>Нет доступных рекомендаций</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onMarkAsClicked={handleMarkAsClicked}
          />
        ))}
      </div>
    </div>
  );
};
