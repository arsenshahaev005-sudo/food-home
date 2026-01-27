/**
 * Компонент сохраненных товаров.
 * 
 * Обоснование: Возможность сохранения товаров на потом позволяет
 * пользователям вернуться к покупке позже, что повышает конверсию.
 */

import React from 'react';
import { getFullImageUrl } from '@/lib/api';
import { SavedCartItem as SavedItemType } from '@/lib/api/cartApi';

interface SavedItemsProps {
  items: SavedItemType[];
  onMoveToCart: (itemId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onRemove: (itemId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  isMoving?: boolean;
}

export const SavedItems: React.FC<SavedItemsProps> = ({
  items,
  onMoveToCart,
  onRemove,
  isMoving = false,
}) => {
  const handleMoveToCart = async (itemId: string) => {
    try {
      await onMoveToCart(itemId);
    } catch (error) {
      console.error('Failed to move item to cart:', error);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!confirm('Удалить сохраненный товар?')) return;
    try {
      await onRemove(itemId);
    } catch (error) {
      console.error('Failed to remove saved item:', error);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>У вас нет сохраненных товаров</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Сохраненные товары</h2>
      <div className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            {/* Dish Image */}
            <div className="flex-shrink-0">
              <img
                src={getFullImageUrl(item.dish.photo)}
                alt={item.dish.name}
                className="w-20 h-20 object-cover rounded-md"
              />
            </div>

            {/* Dish Info */}
            <div className="flex-grow min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{item.dish.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {parseFloat(item.dish.price).toFixed(2)} ₽ × {item.quantity}
              </p>
              {item.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Сохранено: {new Date(item.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleMoveToCart(item.id)}
                disabled={isMoving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Переместить в корзину"
                type="button"
              >
                {isMoving ? '...' : 'В корзину'}
              </button>
              <button
                onClick={() => handleRemove(item.id)}
                disabled={isMoving}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Удалить"
                type="button"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
