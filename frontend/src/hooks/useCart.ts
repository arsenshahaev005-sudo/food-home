/**
 * Custom hook для работы с корзиной.
 * 
 * Обоснование: Централизует логику работы с корзиной,
 * упрощает управление состоянием и API запросами.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  saveForLater,
  getSavedItems,
  removeSavedItem,
  moveSavedToCart,
  CartSummary,
  SavedCartItem,
} from '@/lib/api/cartApi';

export interface UseCartReturn {
  // Cart state
  cart: CartSummary | null;
  savedItems: SavedCartItem[];
  isLoading: boolean;
  isUpdating: boolean;
  isMoving: boolean;
  error: string | null;

  // Cart actions
  refreshCart: () => Promise<void>;
  handleAddToCart: (dishId: string, quantity?: number, selectedToppings?: any[]) => Promise<void>;
  handleUpdateQuantity: (dishId: string, quantity: number, selectedToppings?: any[]) => Promise<void>;
  handleRemoveFromCart: (dishId: string, selectedToppings?: any[]) => Promise<void>;
  handleClearCart: () => Promise<void>;
  handleSaveForLater: (dishId: string, quantity: number, selectedToppings?: any[]) => Promise<void>;
  handleMoveSavedToCart: (itemId: string) => Promise<void>;
  handleRemoveSavedItem: (itemId: string) => Promise<void>;
}

export const useCart = (token: string): UseCartReturn => {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [savedItems, setSavedItems] = useState<SavedCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart and saved items
  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cartData, savedData] = await Promise.all([
        getCart(token),
        getSavedItems(token),
      ]);
      setCart(cartData);
      setSavedItems(savedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      console.error('Failed to load cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Add item to cart
  const handleAddToCart = useCallback(async (
    dishId: string,
    quantity: number = 1,
    selectedToppings?: any[]
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      await addToCart(token, dishId, quantity, selectedToppings);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to cart');
      console.error('Failed to add item to cart:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Update item quantity
  const handleUpdateQuantity = useCallback(async (
    dishId: string,
    quantity: number,
    selectedToppings?: any[]
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      await updateCartItemQuantity(token, dishId, quantity, selectedToppings);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
      console.error('Failed to update quantity:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Remove item from cart
  const handleRemoveFromCart = useCallback(async (
    dishId: string,
    selectedToppings?: any[]
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      await removeFromCart(token, dishId, selectedToppings);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from cart');
      console.error('Failed to remove item from cart:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Clear cart
  const handleClearCart = useCallback(async () => {
    if (!confirm('Очистить корзину?')) return;
    setIsUpdating(true);
    setError(null);
    try {
      await clearCart(token);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      console.error('Failed to clear cart:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Save item for later
  const handleSaveForLater = useCallback(async (
    dishId: string,
    quantity: number,
    selectedToppings?: any[]
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      await saveForLater({ dish_id: dishId, quantity, selected_toppings: selectedToppings }, token);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item for later');
      console.error('Failed to save item for later:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Move saved item to cart
  const handleMoveSavedToCart = useCallback(async (itemId: string) => {
    setIsMoving(true);
    setError(null);
    try {
      await moveSavedToCart(itemId, token);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move item to cart');
      console.error('Failed to move item to cart:', err);
      throw err;
    } finally {
      setIsMoving(false);
    }
  }, [token, refreshCart]);

  // Remove saved item
  const handleRemoveSavedItem = useCallback(async (itemId: string) => {
    setIsUpdating(true);
    setError(null);
    try {
      await removeSavedItem(itemId, token);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove saved item');
      console.error('Failed to remove saved item:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [token, refreshCart]);

  // Load cart on mount
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return {
    cart,
    savedItems,
    isLoading,
    isUpdating,
    isMoving,
    error,
    refreshCart,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveFromCart,
    handleClearCart,
    handleSaveForLater,
    handleMoveSavedToCart,
    handleRemoveSavedItem,
  };
};
