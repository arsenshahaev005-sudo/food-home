/**
 * API клиент для работы с черновиками заказов.
 * 
 * Обоснование: Устраняет проблему потери данных при заполнении формы заказа.
 * Пользователь может вернуться к оформлению позже и продолжить с того же места.
 */

import { BASE_URL } from '../api';

export interface Topping {
  id: string;
  name: string;
  price: number;
}

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
async function apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
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

export interface OrderDraft {
  id: string;
  user: string;
  dish: {
    id: string;
    name: string;
    price: string;
    photo: string;
  };
  quantity: number;
  delivery_type: 'BUILDING' | 'DOOR';
  delivery_address_text: string;
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_price: number;
  selected_toppings: Topping[];
  is_gift: boolean;
  is_anonymous: boolean;
  recipient_phone: string;
  recipient_name: string;
  recipient_address_text: string;
  recipient_latitude: number | null;
  recipient_longitude: number | null;
  recipient_specified_time: string | null;
  updated_at: string;
}

export interface OrderDraftFormData {
  dish: string;
  quantity: number;
  delivery_type?: 'BUILDING' | 'DOOR';
  delivery_address_text?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_price?: number;
  selected_toppings?: Topping[];
  is_gift?: boolean;
  is_anonymous?: boolean;
  recipient_phone?: string;
  recipient_name?: string;
  recipient_address_text?: string;
  recipient_latitude?: number | null;
  recipient_longitude?: number | null;
  recipient_specified_time?: string | null;
}

/**
 * Получить список черновиков заказов текущего пользователя
 */
export async function getOrderDrafts(token: string): Promise<OrderDraft[]> {
  return apiGetAuth<OrderDraft[]>('/api/order-drafts/', token);
}

/**
 * Получить черновик заказа по ID
 */
export async function getOrderDraft(id: string, token: string): Promise<OrderDraft> {
  return apiGetAuth<OrderDraft>(`/api/order-drafts/${id}/`, token);
}

/**
 * Сохранить черновик заказа
 */
export async function saveOrderDraft(data: OrderDraftFormData, token: string): Promise<OrderDraft> {
  return apiPost<OrderDraft>('/api/order-drafts/save_draft/', data, token);
}

/**
 * Обновить черновик заказа
 */
export async function updateOrderDraft(id: string, data: Partial<OrderDraftFormData>, token: string): Promise<OrderDraft> {
  // Используем apiPost для обновления через стандартный ModelViewSet
  return apiPost<OrderDraft>(`/api/order-drafts/${id}/`, data, token);
}

/**
 * Удалить черновик заказа
 */
export async function deleteOrderDraft(id: string, token: string): Promise<void> {
  return apiDelete(`/api/order-drafts/${id}/delete_draft/`, token);
}

/**
 * Получить черновики текущего пользователя
 */
export async function getMyDrafts(token: string): Promise<OrderDraft[]> {
  return apiGetAuth<OrderDraft[]>('/api/order-drafts/my_drafts/', token);
}
