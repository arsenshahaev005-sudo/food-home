/**
 * Custom hook для работы с рекомендациями.
 * 
 * Обоснование: Централизует логику работы с рекомендациями,
 * упрощает управление состоянием и API запросами.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getRecommendations,
  getOrderHistoryRecommendations,
  getSimilarItemsRecommendations,
  getFrequentlyBoughtTogetherRecommendations,
  getSeasonalRecommendations,
  getLocationBasedRecommendations,
  markRecommendationsAsShown,
  markRecommendationAsClicked,
  getPersonalizedOffers,
  activatePersonalizedOffer,
  Recommendation,
  PersonalizedOffer,
} from '@/lib/api/recommendationApi';

export interface UseRecommendationsReturn {
  // Recommendations state
  recommendations: Recommendation[];
  personalizedOffers: PersonalizedOffer[];
  isLoading: boolean;
  error: string | null;

  // Recommendations actions
  refreshRecommendations: () => Promise<void>;
  refreshPersonalizedOffers: () => Promise<void>;
  handleMarkAsShown: (recommendationIds: string[]) => Promise<void>;
  handleMarkAsClicked: (recommendationId: string) => Promise<void>;
  handleActivateOffer: (offerId: string) => Promise<void>;
}

export const useRecommendations = (token: string): UseRecommendationsReturn => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [personalizedOffers, setPersonalizedOffers] = useState<PersonalizedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recommendations
  const refreshRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecommendations(token);
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load personalized offers
  const refreshPersonalizedOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPersonalizedOffers(token);
      setPersonalizedOffers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personalized offers');
      console.error('Failed to load personalized offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Mark recommendations as shown
  const handleMarkAsShown = useCallback(async (recommendationIds: string[]) => {
    try {
      await markRecommendationsAsShown(token, recommendationIds);
      // Update local state to mark as shown
      setRecommendations(prev =>
        prev.map(rec =>
          recommendationIds.includes(rec.id) ? { ...rec, is_shown: true } : rec
        )
      );
    } catch (err) {
      console.error('Failed to mark recommendations as shown:', err);
      throw err;
    }
  }, [token]);

  // Mark recommendation as clicked
  const handleMarkAsClicked = useCallback(async (recommendationId: string) => {
    try {
      await markRecommendationAsClicked(token, recommendationId);
      // Update local state to mark as clicked
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, is_shown: true, is_clicked: true } : rec
        )
      );
    } catch (err) {
      console.error('Failed to mark recommendation as clicked:', err);
      throw err;
    }
  }, [token]);

  // Activate personalized offer
  const handleActivateOffer = useCallback(async (offerId: string) => {
    try {
      await activatePersonalizedOffer(token, offerId);
      await refreshPersonalizedOffers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate offer');
      console.error('Failed to activate offer:', err);
      throw err;
    }
  }, [token, refreshPersonalizedOffers]);

  // Load recommendations on mount
  useEffect(() => {
    refreshRecommendations();
    refreshPersonalizedOffers();
  }, [refreshRecommendations, refreshPersonalizedOffers]);

  return {
    recommendations,
    personalizedOffers,
    isLoading,
    error,
    refreshRecommendations,
    refreshPersonalizedOffers,
    handleMarkAsShown,
    handleMarkAsClicked,
    handleActivateOffer,
  };
};
