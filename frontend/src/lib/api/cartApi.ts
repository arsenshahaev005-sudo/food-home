/**
 * API клиент для работы с корзиной.
 *
 * Обоснование: Корзина - критический элемент конверсии.
 * Возможность изменения количества без перезагрузки, быстрые действия
 * и сохранение на потом повышают удобство использования и конверсию.
 */

import { apiGetAuth, apiPost, apiDelete } from '../apiClient';

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
  return apiGetAuth<CartSummary>('/api/cart/', token);
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
    dish: dishId,  // Backend expects 'dish', not 'dish_id'
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
