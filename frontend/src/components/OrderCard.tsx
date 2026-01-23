'use client';

import React, { useState } from 'react';
import { reorderOrder } from '../lib/api';
import { Order } from '../types/api';

interface OrderCardProps {
  order: Order;
  token: string;
  onReorderSuccess?: (newOrder: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, token, onReorderSuccess }) => {
  const [isReordering, setIsReordering] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReorder = async () => {
    if (!token) {
      alert('Для повторного заказа необходимо авторизоваться');
      return;
    }

    try {
      setIsReordering(true);
      const newOrder = await reorderOrder(order.id, token);
      
      if (onReorderSuccess) {
        onReorderSuccess(newOrder);
      }
      
      alert('Заказ успешно создан!');
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Ошибка при создании повторного заказа');
    } finally {
      setIsReordering(false);
      setShowConfirm(false);
    }
  };

  // Helper to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{order.dish.name}</h3>
          <p className="text-gray-600 text-sm">{order.user_name}</p>
          <p className="text-gray-500 text-xs mt-1">ID заказа: {order.id}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg">{order.total_price} ₽</p>
          <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`px-2 py-1 rounded-full text-xs ${
          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
          order.status === 'DELIVERING' ? 'bg-blue-100 text-blue-800' :
          order.status === 'COOKING' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {order.status.replace(/_/g, ' ')}
        </span>
        {order.is_urgent && (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            Срочный
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-sm"><strong>Количество:</strong> {order.quantity}</p>
        <p className="text-sm"><strong>Статус:</strong> {order.status}</p>
        {order.delivery_address && (
          <p className="text-sm"><strong>Адрес:</strong> {order.delivery_address}</p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isReordering}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isReordering ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Обработка...
            </>
          ) : (
            'Повторить заказ'
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-2">Повторить заказ?</h3>
            <p className="text-gray-600 mb-4">
              Вы уверены, что хотите повторить заказ <strong>{order.dish.name}</strong>?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                disabled={isReordering}
              >
                Отмена
              </button>
              <button
                onClick={handleReorder}
                disabled={isReordering}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;