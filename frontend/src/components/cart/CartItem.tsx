/**
 * Компонент товара в корзине с быстрыми действиями.
 * 
 * Обоснование: Возможность изменения количества без перезагрузки,
 * быстрые действия (удаление, увеличение/уменьшение) и сохранение на потом
 * повышают удобство использования и конверсию.
 */

import React, { useState } from 'react';
import { getFullImageUrl } from '@/lib/api';
import { CartItem as CartItemType } from '@/lib/api/cartApi';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (dishId: string, quantity: number, selectedToppings?: any[]) => Promise<void>; // eslint-disable-line no-unused-vars
  onRemove: (dishId: string, selectedToppings?: any[]) => Promise<void>; // eslint-disable-line no-unused-vars
  onSaveForLater: (dishId: string, quantity: number, selectedToppings?: any[]) => Promise<void>; // eslint-disable-line no-unused-vars
  isUpdating?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onSaveForLater,
  isUpdating = false,
}) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isSaving, setIsSaving] = useState(false);

  const handleIncrement = async () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    try {
      await onUpdateQuantity(item.dish.id, newQuantity, item.selected_toppings);
    } catch (error) {
      setQuantity(quantity); // Revert on error
      console.error('Failed to update quantity:', error);
    }
  };

  const handleDecrement = async () => {
    if (quantity <= 1) return;
    const newQuantity = quantity - 1;
    setQuantity(newQuantity);
    try {
      await onUpdateQuantity(item.dish.id, newQuantity, item.selected_toppings);
    } catch (error) {
      setQuantity(quantity); // Revert on error
      console.error('Failed to update quantity:', error);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Удалить товар из корзины?')) return;
    try {
      await onRemove(item.dish.id, item.selected_toppings);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleSaveForLater = async () => {
    setIsSaving(true);
    try {
      await onSaveForLater(item.dish.id, quantity, item.selected_toppings);
    } catch (error) {
      console.error('Failed to save for later:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPrice = (parseFloat(item.price_at_the_moment) * quantity).toFixed(2);

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Dish Image */}
      <div className="flex-shrink-0">
        <img
          src={getFullImageUrl(item.dish.photo)}
          alt={item.dish.name}
          className="w-24 h-24 object-cover rounded-md"
        />
      </div>

      {/* Dish Info */}
      <div className="flex-grow min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{item.dish.name}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {parseFloat(item.price_at_the_moment).toFixed(2)} ₽
        </p>
        {item.dish.cooking_time_minutes > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            ⏱ {item.dish.cooking_time_minutes} мин
          </p>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={quantity <= 1 || isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Уменьшить количество"
            type="button"
          >
            <span className="text-gray-700">−</span>
          </button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <button
            onClick={handleIncrement}
            disabled={isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Увеличить количество"
            type="button"
          >
            <span className="text-gray-700">+</span>
          </button>
        </div>

        {/* Total Price */}
        <p className="font-semibold text-gray-900">{totalPrice} ₽</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSaveForLater}
          disabled={isSaving || isUpdating}
          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Сохранить на потом"
          type="button"
        >
          {isSaving ? '...' : 'На потом'}
        </button>
        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Удалить из корзины"
          type="button"
        >
          Удалить
        </button>
      </div>
    </div>
  );
};
