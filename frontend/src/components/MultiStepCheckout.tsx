'use client';

import React, { useState, useEffect } from 'react';
import CheckoutSteps, { CheckoutStep } from './checkout/CheckoutSteps';
import OrderSummary from './checkout/OrderSummary';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useOrderDraft } from '../hooks/useOrderDraft';
import { OrderDraftFormData } from '../lib/api/orderDraftApi';

interface CartItem {
  id: string;
  dish: string;
  quantity: number;
  price: number;
  image: string;
  name: string;
}

interface MultiStepCheckoutProps {
  items: CartItem[];
  token?: string;
  onBusyChange?: (busy: boolean) => void;
  onSuccess?: (result: { orders: Array<{ id: string }> }) => void;
  onError?: (message: string) => void;
}

const MultiStepCheckout: React.FC<MultiStepCheckoutProps> = ({
  items,
  token,
  onBusyChange,
  onSuccess,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([]);
  const [formData, setFormData] = useState({
    // Delivery step
    name: '',
    phone: '',
    address: '',
    deliveryType: 'DOOR' as 'BUILDING' | 'DOOR',
    apartment: '',
    floor: '',
    entrance: '',
    intercom: '',
    comment: '',
    
    // Payment step
    paymentMethod: 'card' as 'card' | 'sbp',
    
    // Review step
    acceptTerms: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Интеграция с API черновиков заказов
  const {
    currentDraft,
    saveDraft,
    updateDraft,
  } = useOrderDraft(token, { autoSave: true, autoSaveDelay: 2000 });

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryPrice = formData.deliveryType === 'DOOR' ? 200 : 100;
  const discount = 0;
  const total = subtotal + deliveryPrice - discount;

  // Auto-save form data
  useEffect(() => {
    localStorage.setItem('checkout_form_data', JSON.stringify(formData));
  }, [formData]);

  // Load saved form data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('checkout_form_data');
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Auto-save draft to backend when form data changes
  useEffect(() => {
    if (!token || !items.length) return;

    // Prepare draft data from current form state and items
    const draftData: OrderDraftFormData = {
      dish: items[0]?.dish || '',
      quantity: items[0]?.quantity || 1,
      delivery_type: formData.deliveryType,
      delivery_address_text: formData.address,
      apartment: formData.apartment,
      entrance: formData.entrance,
      floor: formData.floor,
      intercom: formData.intercom,
      delivery_price: formData.deliveryType === 'DOOR' ? 200 : 100,
    };

    // Save or update draft
    if (currentDraft) {
      updateDraft(currentDraft.id, draftData);
    } else {
      saveDraft(draftData);
    }
  }, [formData, items, token, currentDraft, saveDraft, updateDraft]);

  const handleStepChange = (step: CheckoutStep): void => {
    setCurrentStep(step);
  };

  const handleInputChange = (field: string, value: unknown): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = (): void => {
    // Validate current step before proceeding
    if (currentStep === 'delivery') {
      if (!formData.name || !formData.phone || !formData.address) {
        setStatus('Заполните все обязательные поля');
        return;
      }
      setCompletedSteps((prev) => [...prev, 'delivery']);
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCompletedSteps((prev) => [...prev, 'payment']);
      setCurrentStep('review');
    }
    setStatus(null);
  };

  const handlePreviousStep = (): void => {
    if (currentStep === 'payment') {
      setCurrentStep('delivery');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.acceptTerms) {
      setStatus('Необходимо принять условия');
      return;
    }

    setLoading(true);
    onBusyChange?.(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setStatus(null);
      onSuccess?.({ orders: items.map((item) => ({ id: item.id })) });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка оформления заказа';
      setStatus(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  };

  const renderDeliveryStep = (): React.ReactNode => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Информация о доставке</h3>
      
      {/* Contact Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Имя *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Введите ваше имя"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Телефон *
          </label>
          <div className="rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 transition-all overflow-hidden px-4 py-[11px]">
            <PhoneInput
              international
              defaultCountry="RU"
              value={formData.phone}
              onChange={(val) => handleInputChange('phone', val || '')}
              className="w-full bg-transparent"
              placeholder="+7 (999) 999-99-99"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Адрес доставки *
        </label>
        <input
          id="address"
          type="text"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Улица, дом"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          required
        />
      </div>

      {/* Delivery Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Способ доставки
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleInputChange('deliveryType', 'BUILDING')}
            className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all ${
              formData.deliveryType === 'BUILDING'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            До подъезда
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('deliveryType', 'DOOR')}
            className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all ${
              formData.deliveryType === 'DOOR'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            До двери
          </button>
        </div>
      </div>

      {/* Additional Address Details */}
      {formData.deliveryType === 'DOOR' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="entrance" className="block text-sm font-medium text-gray-700 mb-2">
              Подъезд
            </label>
            <input
              id="entrance"
              type="text"
              value={formData.entrance}
              onChange={(e) => handleInputChange('entrance', e.target.value)}
              placeholder="№"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>
          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
              Этаж
            </label>
            <input
              id="floor"
              type="text"
              value={formData.floor}
              onChange={(e) => handleInputChange('floor', e.target.value)}
              placeholder="№"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>
          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
              Квартира
            </label>
            <input
              id="apartment"
              type="text"
              value={formData.apartment}
              onChange={(e) => handleInputChange('apartment', e.target.value)}
              placeholder="№"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>
          <div>
            <label htmlFor="intercom" className="block text-sm font-medium text-gray-700 mb-2">
              Домофон
            </label>
            <input
              id="intercom"
              type="text"
              value={formData.intercom}
              onChange={(e) => handleInputChange('intercom', e.target.value)}
              placeholder="Код"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Комментарий к заказу
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => handleInputChange('comment', e.target.value)}
          placeholder="Дополнительная информация для курьера"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNextStep}
          disabled={loading}
          className="px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Продолжить
        </button>
      </div>
    </div>
  );

  const renderPaymentStep = (): React.ReactNode => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Способ оплаты</h3>
      
      {/* Payment Methods */}
      <div className="space-y-4">
        <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 transition-colors">
          <input
            type="radio"
            name="paymentMethod"
            checked={formData.paymentMethod === 'card'}
            onChange={() => handleInputChange('paymentMethod', 'card')}
            className="w-5 h-5 text-orange-600 focus:ring-orange-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Банковская карта</div>
            <div className="text-sm text-gray-500">Visa, MasterCard, МИР</div>
          </div>
        </label>

        <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 transition-colors">
          <input
            type="radio"
            name="paymentMethod"
            checked={formData.paymentMethod === 'sbp'}
            onChange={() => handleInputChange('paymentMethod', 'sbp')}
            className="w-5 h-5 text-orange-600 focus:ring-orange-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">СБП (Система быстрых платежей)</div>
            <div className="text-sm text-gray-500">Оплата через QR-код</div>
          </div>
        </label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePreviousStep}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={handleNextStep}
          disabled={loading}
          className="px-8 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Продолжить
        </button>
      </div>
    </div>
  );

  const renderReviewStep = (): React.ReactNode => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Проверка заказа</h3>
      
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Детали заказа</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Имя:</span>
            <span className="font-medium text-gray-900">{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Телефон:</span>
            <span className="font-medium text-gray-900">{formData.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Адрес:</span>
            <span className="font-medium text-gray-900">{formData.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Способ доставки:</span>
            <span className="font-medium text-gray-900">
              {formData.deliveryType === 'DOOR' ? 'До двери' : 'До подъезда'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Способ оплаты:</span>
            <span className="font-medium text-gray-900">
              {formData.paymentMethod === 'card' ? 'Банковская карта' : 'СБП'}
            </span>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
            className="mt-1 w-5 h-5 text-orange-600 focus:ring-orange-500 rounded"
            required
          />
          <span className="text-sm text-gray-600">
            Я согласен с{' '}
            <a href="/legal/offer" className="text-orange-600 hover:underline">
              условиями использования
            </a>{' '}
            и{' '}
            <a href="/legal/privacy" className="text-orange-600 hover:underline">
              политикой конфиденциальности
            </a>
          </span>
        </label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePreviousStep}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !formData.acceptTerms}
          className="px-8 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Оформление...' : 'Оформить заказ'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="checkout-container">
      {/* Progress Bar */}
      <div className="mb-8">
        <CheckoutSteps
          currentStep={currentStep}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 'delivery' && renderDeliveryStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'review' && renderReviewStep()}
      </div>

      {/* Order Summary Sidebar */}
      <OrderSummary
        items={items}
        subtotal={subtotal}
        deliveryPrice={deliveryPrice}
        discount={discount}
        total={total}
      />

      {/* Error Message */}
      {status && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-right-4 duration-300">
          {status}
        </div>
      )}
    </div>
  );
};

export default MultiStepCheckout;
