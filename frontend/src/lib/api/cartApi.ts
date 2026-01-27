/**
 * API клиент для работы с корзиной.
 * 
 * Обоснование: Корзина - критический элемент конверсии.
 * Возможность изменения количества без перезагрузки, быстрые действия
 * и сохранение на потом повышают удобство использования и конверсию.
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
async function apiPatch<T>(path: string, body: any, token: string): Promise<T> { // eslint-disable-line no-unused-vars
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

export interface CartItem {
  id: string;
  dish: {
    id: string;
    name: string;
    photo: string;
    price: string;
    cooking_time_minutes: number;
  };
  quantity: number;
  price_at_the_moment: string;
  selected_toppings?: any[];
}

export interface CartSummary {
  total_items: number;
  total_price: number;
  total_cooking_time: number;
  items: CartItem[];
}

export interface SavedCartItem {
  id: string;
  dish: {
    id: string;
    name: string;
    photo: string;
    price: string;
  };
  quantity: number;
  selected_toppings?: any[];
  notes: string;
  created_at: string;
}

export interface SaveForLaterRequest {
  dish_id: string;
  quantity: number;
  selected_toppings?: any[];
  notes?: string;
}

export interface UpdateQuantityRequest {
  dish_id: string;
  quantity: number;
  selected_toppings?: any[];
}

/**
 * Получить корзину текущего пользователя с полной информацией
 */
export async function getCart(token: string): Promise<CartSummary> {
  return apiGetAuth<CartSummary>('/api/cart/summary/', token);
}

/**
 * Добавить товар в корзину
 */
export async function addToCart(
  token: string,
  dishId: string,
  quantity: number = 1,
  selectedToppings?: any[]
): Promise<CartItem> {
  return apiPost<CartItem>('/api/cart/add/', {
    dish_id: dishId,
    quantity,
    selected_toppings: selectedToppings || []
  }, token);
}

/**
 * Обновить количество товара в корзине
 */
export async function updateCartItemQuantity(
  token: string,
  dishId: string,
  quantity: number,
  selectedToppings?: any[]
): Promise<CartItem> {
  return apiPost<CartItem>('/api/cart/update-quantity/', {
    dish_id: dishId,
    quantity,
    selected_toppings: selectedToppings || []
  }, token);
}

/**
 * Удалить товар из корзины
 */
export async function removeFromCart(
  token: string,
  dishId: string,
  selectedToppings?: any[]
): Promise<void> {
  await apiPost<void>('/api/cart/remove/', {
    dish_id: dishId,
    selected_toppings: selectedToppings || []
  }, token);
}

/**
 * Очистить корзину
 */
export async function clearCart(token: string): Promise<void> {
  await apiDelete('/api/cart/clear/', token);
}

/**
 * Сохранить товар на потом
 */
export async function saveForLater(
  data: SaveForLaterRequest,
  token: string
): Promise<SavedCartItem> {
  return apiPost<SavedCartItem>('/api/cart/save-for-later/', data, token);
}

/**
 * Получить список сохраненных товаров
 */
export async function getSavedItems(token: string): Promise<SavedCartItem[]> {
  return apiGetAuth<SavedCartItem[]>('/api/cart/saved-items/', token);
}

/**
 * Удалить сохраненный товар
 */
export async function removeSavedItem(itemId: string, token: string): Promise<void> {
  await apiDelete(`/api/cart/saved-items/${itemId}/`, token);
}

/**
 * Переместить сохраненный товар в корзину
 */
export async function moveSavedToCart(itemId: string, token: string): Promise<CartItem> {
  return apiPost<CartItem>(`/api/cart/saved-items/${itemId}/move-to-cart/`, {}, token);
}
