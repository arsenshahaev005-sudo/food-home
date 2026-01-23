/**
 * API клиент для работы с рекомендациями.
 * 
 * Обоснование: Персонализация повышает средний чек и вовлеченность.
 * Рекомендации на основе истории заказов, похожие товары и
 * часто покупают вместе помогают пользователям находить интересные блюда.
 */

import { BASE_URL } from '../api';

// Helper function for authenticated GET requests
async function apiGetAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
  
  const json = await res.json();
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// Helper function for authenticated POST requests
async function apiPost<T>(path: string, body: any, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
  
  const json = await res.json();
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export interface RecommendationDish {
  id: string;
  name: string;
  photo: string;
  price: string;
  producer: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
  rating?: number;
  order_count?: number;
  cooking_time_minutes: number;
}

export interface Recommendation {
  id: string;
  dish: RecommendationDish;
  recommendation_type: 'ORDER_HISTORY' | 'SIMILAR_ITEMS' | 'FREQUENTLY_BOUGHT' | 'SEASONAL' | 'LOCATION_BASED';
  score: number;
  reason: string;
  is_shown: boolean;
  is_clicked: boolean;
  created_at: string;
}

export interface PersonalizedOffer {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  valid_from: string;
  valid_until: string;
  min_order_amount?: number;
  applicable_dishes?: string[];
  is_active: boolean;
  created_at: string;
}

/**
 * Получить рекомендации для текущего пользователя
 */
export async function getRecommendations(token: string, limit: number = 20): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/?limit=${limit}`, token);
}

/**
 * Получить рекомендации на основе истории заказов
 */
export async function getOrderHistoryRecommendations(token: string, limit: number = 10): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/order-history/?limit=${limit}`, token);
}

/**
 * Получить похожие товары
 */
export async function getSimilarItemsRecommendations(token: string, dishId: string, limit: number = 5): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/similar-items/${dishId}/?limit=${limit}`, token);
}

/**
 * Получить товары, часто покупаемые вместе
 */
export async function getFrequentlyBoughtTogetherRecommendations(token: string, dishId: string, limit: number = 5): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/frequently-bought/${dishId}/?limit=${limit}`, token);
}

/**
 * Получить сезонные рекомендации
 */
export async function getSeasonalRecommendations(token: string, limit: number = 10): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/seasonal/?limit=${limit}`, token);
}

/**
 * Получить рекомендации на основе локации
 */
export async function getLocationBasedRecommendations(token: string, limit: number = 10): Promise<Recommendation[]> {
  return apiGetAuth<Recommendation[]>(`/api/recommendations/location-based/?limit=${limit}`, token);
}

/**
 * Отметить рекомендации как просмотренные
 */
export async function markRecommendationsAsShown(token: string, recommendationIds: string[]): Promise<void> {
  await apiPost<void>('/api/recommendations/mark-shown/', { recommendation_ids: recommendationIds }, token);
}

/**
 * Отметить рекомендацию как кликнутую
 */
export async function markRecommendationAsClicked(token: string, recommendationId: string): Promise<void> {
  await apiPost<void>(`/api/recommendations/${recommendationId}/mark-clicked/`, {}, token);
}

/**
 * Получить персонализированные предложения
 */
export async function getPersonalizedOffers(token: string): Promise<PersonalizedOffer[]> {
  return apiGetAuth<PersonalizedOffer[]>('/api/offers/personalized/', token);
}

/**
 * Активировать персонализированное предложение
 */
export async function activatePersonalizedOffer(token: string, offerId: string): Promise<void> {
  await apiPost<void>(`/api/offers/personalized/${offerId}/activate/`, {}, token);
}
