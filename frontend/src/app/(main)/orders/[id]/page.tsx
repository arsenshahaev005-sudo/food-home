'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OrderRejectModal, TipsModal, DeliveryRescheduleModal } from '@/components/modals';
import { api } from '@/lib/api';
import { OrderDetails } from '@/lib/types';
import { Order } from '@/types/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    const t = getCookie('accessToken');
    if (t) {
      setToken(t);
      fetchOrder(t);
    } else {
      setLoading(false);
      setError('Необходимо войти в аккаунт');
    }
  }, [orderId]);

  const fetchOrder = async (authToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/orders/${orderId}/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить заказ');
      }
      
      const data: Order = await response.json();
      setOrder(data as OrderDetails);
    } catch (err) {
      setError('Не удалось загрузить заказ');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!token) return;
    
    try {
      const response = await api.orders.reject(orderId, reason);
      if (!response.ok) {
        throw new Error('Не удалось отклонить заказ');
      }
      
      await fetchOrder(token);
    } catch (err) {
      alert('Не удалось отклонить заказ');
      console.error('Error rejecting order:', err);
    }
  };

  const handleAddTips = async (tipsAmount: number) => {
    if (!token) return;
    
    try {
      const response = await api.orders.addTips(orderId, tipsAmount);
      if (!response.ok) {
        throw new Error('Не удалось добавить чаевые');
      }
      
      await fetchOrder(token);
    } catch (err) {
      alert('Не удалось добавить чаевые');
      console.error('Error adding tips:', err);
    }
  };

  const handleRescheduleDelivery = async (newTime: Date, reason: string) => {
    if (!token) return;
    
    try {
      const response = await api.orders.rescheduleDelivery(
        orderId,
        newTime.toISOString(),
        true,
        reason
      );
      
      if (!response.ok) {
        throw new Error('Не удалось перенести доставку');
      }
      
      await fetchOrder(token);
    } catch (err) {
      alert('Не удалось перенести доставку');
      console.error('Error rescheduling delivery:', err);
    }
  };

  const getStatusInfo = (status: Order['status'], isGift: boolean) => {
    switch (status) {
      case 'WAITING_FOR_PAYMENT':
        return { label: isGift ? 'Подарок: ждём оплаты' : 'Ожидает оплаты', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'WAITING_FOR_RECIPIENT':
        return { label: isGift ? 'Подарок: ждём данные получателя' : 'Ожидает данных', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'WAITING_FOR_ACCEPTANCE':
        return { label: isGift ? 'Подарок: ждём подтверждения' : 'Ожидает подтверждения', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'COOKING':
        return { label: 'Готовится', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'READY_FOR_REVIEW':
        return { label: 'Блюдо готово', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'READY_FOR_DELIVERY':
        return { label: 'Готов к доставке', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'DELIVERING':
        return { label: 'В пути', color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'ARRIVED':
        return { label: 'Доставлен', color: 'text-green-600', bg: 'bg-green-50' };
      case 'COMPLETED':
        return { label: isGift ? 'Подарок доставлен' : 'Завершен', color: 'text-green-600', bg: 'bg-green-50' };
      case 'CANCELLED':
        return { label: isGift ? 'Подарок отменён' : 'Отменен', color: 'text-red-600', bg: 'bg-red-50' };
      case 'DISPUTE':
        return { label: 'Спор', color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { label: status, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-black text-gray-900 mb-4">Ошибка</h1>
        <p className="text-gray-500 mb-8">{error || 'Заказ не найден'}</p>
        <button
          onClick={() => router.back()}
          className="btn-warm px-8 py-3 rounded-2xl font-black"
        >
          Вернуться назад
        </button>
      </div>
    );
  }

  const status = getStatusInfo(order.status, !!order.is_gift);
  const isSeller = (order as any).is_seller || false;
  const canReject = isSeller && order.status === 'WAITING_FOR_ACCEPTANCE';
  const canAddTips = !isSeller && order.status === 'COMPLETED';
  const canReschedule = isSeller && ['COOKING', 'READY_FOR_DELIVERY', 'DELIVERING'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm font-black text-[#c9825b] hover:underline flex items-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Вернуться к заказам
        </button>
      </div>

      {/* Order Header */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Заказ #{orderId}</h1>
            <p className="text-gray-500">
              от {new Date(order.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full ${status.bg} ${status.color} font-bold text-sm`}>
            {status.label}
          </div>
        </div>

        {/* Dish Info */}
        <div className="flex gap-6 p-4 bg-gray-50 rounded-2xl">
          {order.dish.photo && (
            <img
              src={order.dish.photo}
              alt={order.dish.name}
              className="w-24 h-24 rounded-xl object-cover"
            />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">{order.dish.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{order.dish.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Количество: {order.quantity}</span>
              <span className="text-gray-600">Цена: {order.total_price} ₽</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        {order.delivery_address_text && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">Информация о доставке</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Адрес:</span> {order.delivery_address_text}
              </p>
              {order.delivery_type && (
                <p className="text-gray-600">
                  <span className="font-medium">Тип доставки:</span>{' '}
                  {order.delivery_type === 'BUILDING' ? 'До подъезда' : 'До двери'}
                </p>
              )}
              {order.delivery_price && (
                <p className="text-gray-600">
                  <span className="font-medium">Стоимость доставки:</span> {order.delivery_price} ₽
                </p>
              )}
            </div>
          </div>
        )}

        {/* Additional Info */}
        {order.is_gift && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-purple-700 font-medium">🎁 Это подарочный заказ</p>
            </div>
          </div>
        )}

        {/* Order Details */}
        {order.rejection_reason && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-medium mb-2">Причина отклонения:</p>
              <p className="text-red-600 text-sm">{order.rejection_reason}</p>
            </div>
          </div>
        )}

        {order.delivery_rescheduled_at && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-700 font-medium mb-2">Доставка перенесена:</p>
              <p className="text-yellow-600 text-sm">
                {new Date(order.delivery_rescheduled_at).toLocaleString('ru-RU')}
              </p>
              {order.delivery_rescheduled_reason && (
                <p className="text-yellow-600 text-sm mt-2">{order.delivery_rescheduled_reason}</p>
              )}
            </div>
          </div>
        )}

        {order.tips_amount && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 font-medium">
                💚 Чаевые: {order.tips_amount} ₽
              </p>
              {order.tips_added_at && (
                <p className="text-green-600 text-sm mt-1">
                  Добавлено: {new Date(order.tips_added_at).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        )}

        {order.penalty_points && order.penalty_points > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-medium">
                ⚠️ Штрафные баллы: {order.penalty_points}
              </p>
            </div>
          </div>
        )}

        {order.repeat_customer && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-700 font-medium">
                🔄 Повторный покупатель (бонус -1% комиссии)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {canReject && (
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Отклонить заказ
          </button>
        )}

        {canAddTips && (
          <button
            onClick={() => setShowTipsModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Добавить чаевые
          </button>
        )}

        {canReschedule && (
          <button
            onClick={() => setShowRescheduleModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Перенести доставку
          </button>
        )}
      </div>

      {/* Modals */}
      <OrderRejectModal
        orderId={orderId}
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
      />

      <TipsModal
        orderId={orderId}
        amount={parseFloat(order.total_price)}
        isOpen={showTipsModal}
        onClose={() => setShowTipsModal(false)}
        onAddTips={handleAddTips}
      />

      <DeliveryRescheduleModal
        orderId={orderId}
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onReschedule={handleRescheduleDelivery}
      />
    </div>
  );
}
