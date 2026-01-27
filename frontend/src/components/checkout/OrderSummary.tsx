'use client';

import React from 'react';
import Image from 'next/image';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryPrice: number;
  discount?: number;
  total: number;
  onRemoveItem?: (itemId: string) => void; // eslint-disable-line no-unused-vars
  onUpdateQuantity?: (itemId: string, quantity: number) => void; // eslint-disable-line no-unused-vars
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  subtotal,
  deliveryPrice,
  discount,
  total,
  onRemoveItem,
  onUpdateQuantity,
}) => {
  const handleRemoveItem = (itemId: string): void => {
    onRemoveItem?.(itemId);
  };

  const handleQuantityChange = (itemId: string, delta: number): void => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      const newQuantity = Math.max(1, item.quantity + delta);
      onUpdateQuantity?.(itemId, newQuantity);
    }
  };

  return (
    <aside className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Ваш заказ</h2>

      {/* Items List */}
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
          >
            {/* Image */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover rounded-lg"
                sizes="80px"
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 mb-1 truncate">
                {item.name}
              </h3>
              <p className="text-orange-600 font-semibold mb-2">
                {item.price} ₽
              </p>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(item.id, -1)}
                  disabled={item.quantity <= 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Уменьшить количество"
                  type="button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Увеличить количество"
                  type="button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Удалить из заказа"
                  type="button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {item.price * item.quantity} ₽
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-gray-600">
          <span>Товары</span>
          <span>{subtotal} ₽</span>
        </div>
        
        {discount && discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Скидка</span>
            <span>-{discount} ₽</span>
          </div>
        )}
        
        <div className="flex justify-between text-gray-600">
          <span>Доставка</span>
          <span>{deliveryPrice === 0 ? 'Бесплатно' : `${deliveryPrice} ₽`}</span>
        </div>

        <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
          <span>Итого</span>
          <span className="text-orange-600">{total} ₽</span>
        </div>
      </div>

      {/* Promo Code */}
      <div className="mt-6">
        <label htmlFor="promo-code" className="block text-sm font-medium text-gray-700 mb-2">
          Промокод
        </label>
        <div className="flex gap-2">
          <input
            id="promo-code"
            type="text"
            placeholder="Введите промокод"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Применить
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full mt-6 px-6 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
      >
        Оформить заказ
      </button>

      {/* Trust Badges */}
      <div className="mt-6 flex items-center justify-center gap-4 text-gray-500 text-sm">
        <div className="flex items-center gap-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Безопасная оплата</span>
        </div>
        <div className="flex items-center gap-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>Гарантия качества</span>
        </div>
      </div>
    </aside>
  );
};

export default OrderSummary;
