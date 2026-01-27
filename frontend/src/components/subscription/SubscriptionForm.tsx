/**
 * Компонент формы подписки.
 * 
 * Обоснование: Удобная форма оформления подписки
 * повышает конверсию в подписки.
 */

import React, { useState } from 'react';
import { SubscriptionFormData } from '@/lib/api/subscriptionApi';

interface SubscriptionFormProps {
  dishId: string;
  dishName: string;
  dishPrice: string;
  onSubmit: (_data: SubscriptionFormData) => Promise<void>; // eslint-disable-line no-unused-vars
  isSubmitting?: boolean;
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  dishId,
  dishName,
  dishPrice,
  onSubmit,
  isSubmitting = false,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [deliveryType, setDeliveryType] = useState<'BUILDING' | 'DOOR'>('DOOR');
  const [deliveryAddressText, setDeliveryAddressText] = useState('');
  const [apartment, setApartment] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [intercom, setIntercom] = useState('');
  const [startDate, setStartDate] = useState('');

  const handleSubmit = async () => {
    if (!deliveryAddressText.trim()) {
      alert('Укажите адрес доставки');
      return;
    }

    const data: SubscriptionFormData = {
      dish_id: dishId,
      quantity,
      frequency,
      delivery_type: deliveryType,
      delivery_address_text: deliveryAddressText,
      apartment: apartment || undefined,
      entrance: entrance || undefined,
      floor: floor || undefined,
      intercom: intercom || undefined,
      start_date: startDate || undefined,
    };

    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  };

  const getFrequencyLabel = (freq: string): string => {
    switch (freq) {
      case 'DAILY':
        return 'Ежедневно';
      case 'WEEKLY':
        return 'Еженедельно';
      case 'BIWEEKLY':
        return 'Раз в две недели';
      case 'MONTHLY':
        return 'Ежемесячно';
      default:
        return freq;
    }
  };

  const totalPrice = parseFloat(dishPrice) * quantity;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Оформить подписку на {dishName}
      </h2>

      {/* Dish info */}
      <div className="bg-blue-50 rounded-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-600">Цена за порцию:</p>
            <p className="text-lg font-semibold text-gray-900">{parseFloat(dishPrice).toFixed(2)} ₽</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Итого в месяц:</p>
            <p className="text-2xl font-bold text-blue-600">{totalPrice.toFixed(2)} ₽</p>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Количество порций
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || isSubmitting}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Уменьшить количество"
              type="button"
            >
              −
            </button>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              aria-label="Количество порций"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Увеличить количество"
              type="button"
            >
              +
            </button>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
            Частота доставки
          </label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Частота доставки"
          >
            <option value="DAILY">{getFrequencyLabel('DAILY')}</option>
            <option value="WEEKLY">{getFrequencyLabel('WEEKLY')}</option>
            <option value="BIWEEKLY">{getFrequencyLabel('BIWEEKLY')}</option>
            <option value="MONTHLY">{getFrequencyLabel('MONTHLY')}</option>
          </select>
        </div>

        {/* Delivery type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип доставки
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="BUILDING"
                checked={deliveryType === 'BUILDING'}
                onChange={() => setDeliveryType('BUILDING')}
                className="mr-2"
                disabled={isSubmitting}
                aria-label="До подъезда"
              />
              <span className="text-sm text-gray-700">До подъезда</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="DOOR"
                checked={deliveryType === 'DOOR'}
                onChange={() => setDeliveryType('DOOR')}
                className="mr-2"
                disabled={isSubmitting}
                aria-label="До двери"
              />
              <span className="text-sm text-gray-700">До двери</span>
            </label>
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Адрес доставки
          </label>
          <textarea
            id="address"
            value={deliveryAddressText}
            onChange={(e) => setDeliveryAddressText(e.target.value)}
            placeholder="Улица, дом"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isSubmitting}
            aria-label="Адрес доставки"
          />
        </div>

        {/* Apartment */}
        <div>
          <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
            Квартира
          </label>
          <input
            id="apartment"
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="Номер квартиры"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Квартира"
          />
        </div>

        {/* Entrance */}
        <div>
          <label htmlFor="entrance" className="block text-sm font-medium text-gray-700 mb-2">
            Подъезд
          </label>
          <input
            id="entrance"
            type="text"
            value={entrance}
            onChange={(e) => setEntrance(e.target.value)}
            placeholder="Номер подъезда"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Подъезд"
          />
        </div>

        {/* Floor */}
        <div>
          <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
            Этаж
          </label>
          <input
            id="floor"
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Номер этажа"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Этаж"
          />
        </div>

        {/* Intercom */}
        <div>
          <label htmlFor="intercom" className="block text-sm font-medium text-gray-700 mb-2">
            Домофон
          </label>
          <input
            id="intercom"
            type="text"
            value={intercom}
            onChange={(e) => setIntercom(e.target.value)}
            placeholder="Код домофона"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Домофон"
          />
        </div>

        {/* Start date */}
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
            Дата начала (необязательно)
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            aria-label="Дата начала подписки"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !deliveryAddressText.trim()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          aria-label="Оформить подписку"
          type="button"
        >
          {isSubmitting ? '...' : 'Оформить подписку'}
        </button>
      </div>
    </div>
  );
};
