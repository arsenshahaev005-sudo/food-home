/**
 * API клиент для работы с подписками.
 * 
 * Обоснование: Подписка на регулярные заказы
 * повышает LTV (Lifetime Value) и обеспечивает
 * стабильный доход для продавцов.
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

// Helper function for authenticated PATCH requests
async function apiPatch<T>(path: string, body: any, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
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

// Helper function for authenticated DELETE requests
async function apiDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
}

export interface SubscriptionOrder {
  id: string;
  user: string;
  dish: {
    id: string;
    name: string;
    photo: string;
    price: string;
  };
  quantity: number;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  delivery_type: 'BUILDING' | 'DOOR';
  delivery_address_text: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_price: string;
  start_date: string;
  next_delivery_date?: string | null;
  is_active: boolean;
  paused_until?: string | null;
  created_at: string;
}

export interface SubscriptionFormData {
  dish_id: string;
  quantity: number;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  delivery_type: 'BUILDING' | 'DOOR';
  delivery_address_text: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  start_date?: string;
}

/**
 * Получить подписки текущего пользователя
 */
export async function getSubscriptions(token: string): Promise<SubscriptionOrder[]> {
  return apiGetAuth<SubscriptionOrder[]>('/api/subscriptions/', token);
}

/**
 * Получить подписку по ID
 */
export async function getSubscription(token: string, subscriptionId: string): Promise<SubscriptionOrder> {
  return apiGetAuth<SubscriptionOrder>(`/api/subscriptions/${subscriptionId}/`, token);
}

/**
 * Создать подписку
 */
export async function createSubscription(token: string, data: SubscriptionFormData): Promise<SubscriptionOrder> {
  return apiPost<SubscriptionOrder>('/api/subscriptions/', data, token);
}

/**
 * Обновить подписку
 */
export async function updateSubscription(token: string, subscriptionId: string, data: Partial<SubscriptionFormData>): Promise<SubscriptionOrder> {
  return apiPatch<SubscriptionOrder>(`/api/subscriptions/${subscriptionId}/`, data, token);
}

/**
 * Пауза подписки
 */
export async function pauseSubscription(token: string, subscriptionId: string, pauseUntil?: string): Promise<void> {
  await apiPost<void>(`/api/subscriptions/${subscriptionId}/pause/`, { pause_until: pauseUntil }, token);
}

/**
 * Возобновление подписки
 */
export async function resumeSubscription(token: string, subscriptionId: string): Promise<void> {
  await apiPost<void>(`/api/subscriptions/${subscriptionId}/resume/`, {}, token);
}

/**
 * Отмена подписки
 */
export async function cancelSubscription(token: string, subscriptionId: string): Promise<void> {
  await apiDelete(`/api/subscriptions/${subscriptionId}/`, token);
}

/**
 * Получить следующую дату доставки для подписки
 */
export async function getNextDeliveryDate(token: string, subscriptionId: string): Promise<{ next_delivery_date: string | null }> {
  return apiGetAuth<{ next_delivery_date: string | null }>(`/api/subscriptions/${subscriptionId}/next-delivery/`, token);
}
