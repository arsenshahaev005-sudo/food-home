/**
 * Компонент карточки подписки.
 * 
 * Обоснование: Подписка на регулярные заказы
 * повышает LTV и обеспечивает стабильный доход.
 */

import React from 'react';
import { getFullImageUrl } from '@/lib/api';
import { SubscriptionOrder as SubscriptionType } from '@/lib/api/subscriptionApi';

interface SubscriptionCardProps {
  subscription: SubscriptionType;
  onResume?: (_subscriptionId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onPause?: (_subscriptionId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onCancel?: (_subscriptionId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  isUpdating?: boolean;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onResume,
  onPause,
  onCancel,
  isUpdating = false,
}) => {
  const handleResume = async () => {
    if (!onResume) return;
    try {
      await onResume(subscription.id);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    }
  };

  const handlePause = async () => {
    if (!onPause) return;
    try {
      await onPause(subscription.id);
    } catch (error) {
      console.error('Failed to pause subscription:', error);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    if (!confirm('Отменить подписку?')) return;
    try {
      await onCancel(subscription.id);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const getFrequencyLabel = (frequency: string): string => {
    switch (frequency) {
      case 'DAILY':
        return 'Ежедневно';
      case 'WEEKLY':
        return 'Еженедельно';
      case 'BIWEEKLY':
        return 'Раз в две недели';
      case 'MONTHLY':
        return 'Ежемесячно';
      default:
        return frequency;
    }
  };

  const isPaused = subscription.paused_until && new Date(subscription.paused_until) > new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 ${isPaused ? 'bg-yellow-50' : 'bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{subscription.dish.name}</h3>
            <p className="text-sm text-gray-600">
              {getFrequencyLabel(subscription.frequency)}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPaused
              ? 'bg-yellow-200 text-yellow-800'
              : subscription.is_active
              ? 'bg-green-200 text-green-800'
              : 'bg-gray-200 text-gray-800'
          }`}>
            {isPaused ? 'На паузе' : subscription.is_active ? 'Активна' : 'Неактивна'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Dish info */}
        <div className="flex gap-4 mb-4">
          <img
            src={getFullImageUrl(subscription.dish.photo)}
            alt={subscription.dish.name}
            className="w-24 h-24 object-cover rounded-md"
          />
          <div className="flex-grow">
            <p className="text-sm text-gray-600">
              Количество: <span className="font-semibold text-gray-900">{subscription.quantity}</span> порций
            </p>
            <p className="text-sm text-gray-600">
              Цена: <span className="font-semibold text-gray-900">{parseFloat(subscription.dish.price).toFixed(2)} ₽</span>
            </p>
            <p className="text-sm text-gray-600">
              Итого: <span className="font-semibold text-gray-900">
                {(parseFloat(subscription.dish.price) * subscription.quantity).toFixed(2)} ₽
              </span>
            </p>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Доставка</h4>
          <p className="text-sm text-gray-600 mb-1">
            Тип: <span className="font-medium">{subscription.delivery_type === 'DOOR' ? 'До двери' : 'До подъезда'}</span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Адрес: {subscription.delivery_address_text}
          </p>
          {subscription.apartment && (
            <p className="text-sm text-gray-600 mb-1">
              Квартира: {subscription.apartment}
            </p>
          )}
          {subscription.entrance && (
            <p className="text-sm text-gray-600 mb-1">
              Подъезд: {subscription.entrance}
            </p>
          )}
          {subscription.floor && (
            <p className="text-sm text-gray-600 mb-1">
              Этаж: {subscription.floor}
            </p>
          )}
          {subscription.intercom && (
            <p className="text-sm text-gray-600">
              Домофон: {subscription.intercom}
            </p>
          )}
          <p className="text-sm text-gray-600">
            Цена доставки: {parseFloat(subscription.delivery_price).toFixed(2)} ₽
          </p>
        </div>

        {/* Dates info */}
        <div className="bg-blue-50 rounded-md p-3 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Даты</h4>
          <p className="text-sm text-gray-600 mb-1">
            Начало: {new Date(subscription.start_date).toLocaleDateString('ru-RU')}
          </p>
          {subscription.next_delivery_date && (
            <p className="text-sm text-gray-600">
              Следующая доставка: {new Date(subscription.next_delivery_date).toLocaleDateString('ru-RU')}
            </p>
          )}
          {isPaused && subscription.paused_until && (
            <p className="text-sm text-yellow-700">
              Пауза до: {new Date(subscription.paused_until).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isPaused && subscription.is_active && onResume && (
            <button
              onClick={handleResume}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Возобновить подписку"
              type="button"
            >
              {isUpdating ? '...' : 'Возобновить'}
            </button>
          )}
          {!isPaused && subscription.is_active && onPause && (
            <button
              onClick={handlePause}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Пауза подписки"
              type="button"
            >
              {isUpdating ? '...' : 'Пауза'}
            </button>
          )}
          {onCancel && (
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Отменить подписку"
              type="button"
            >
              {isUpdating ? '...' : 'Отменить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
