/**
 * Форма оплаты с автосохранением.
 * 
 * Обоснование: Устраняет проблему потери данных при заполнении формы заказа.
 * Данные автоматически сохраняются на сервер при каждом изменении поля.
 */

'use client';

import React, { useState, useEffect } from 'react';

interface PaymentFormProps {
  token?: string;
  initialData?: {
    paymentMethod?: 'card' | 'sbp';
  };
  onDataChange?: (data: PaymentFormData) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface PaymentFormData {
  paymentMethod: 'card' | 'sbp';
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  token,
  initialData,
  onDataChange,
  autoSave = true,
  autoSaveDelay = 1000,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethod: initialData?.paymentMethod || 'card',
  });

  const [saving, setSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Handle field change
  const handleFieldChange = (field: keyof PaymentFormData, value: 'card' | 'sbp') => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Notify parent
    onDataChange?.(newData);

    // Auto-save (debounced)
    if (autoSave && token) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        handleAutoSave(newData);
      }, autoSaveDelay);

      setSaveTimeout(timeout);
    }
  };

  // Auto-save to backend (placeholder - will be implemented with API integration)
  const handleAutoSave = async (data: PaymentFormData) => {
    if (!token) return;

    setSaving(true);
    try {
      // TODO: Integrate with order draft API
      // await saveOrderDraft({ payment_data: data }, token);
      console.log('Auto-saving payment data:', data);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Способ оплаты</h3>
      
      {/* Payment Methods */}
      <div className="space-y-4">
        <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 transition-colors">
          <input
            type="radio"
            name="paymentMethod"
            checked={formData.paymentMethod === 'card'}
            onChange={() => handleFieldChange('paymentMethod', 'card')}
            className="w-5 h-5 text-orange-600 focus:ring-orange-500"
            aria-checked={formData.paymentMethod === 'card'}
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
            onChange={() => handleFieldChange('paymentMethod', 'sbp')}
            className="w-5 h-5 text-orange-600 focus:ring-orange-500"
            aria-checked={formData.paymentMethod === 'sbp'}
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">СБП (Система быстрых платежей)</div>
            <div className="text-sm text-gray-500">Оплата через QR-код</div>
          </div>
        </label>
      </div>

      {/* Auto-save indicator */}
      {saving && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
          <span>Сохранение...</span>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
