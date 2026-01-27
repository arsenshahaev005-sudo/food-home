'use client';

import React, { useState } from 'react';
import { TipsModalProps } from '../../lib/types';

const TIP_OPTIONS = [
  { value: 0, label: 'Без чаевых' },
  { value: 50, label: '50 ₽' },
  { value: 100, label: '100 ₽' },
  { value: 200, label: '200 ₽' },
  { value: 500, label: '500 ₽' },
];

export default function TipsModal({
  orderId,
  amount,
  isOpen,
  onClose,
  onAddTips,
}: TipsModalProps) {
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTipSelect = (tipValue: number) => {
    setSelectedTip(tipValue);
    setCustomTip('');
    setError(null);
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setSelectedTip(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tipAmount = customTip ? parseInt(customTip, 10) : selectedTip;
    
    if (isNaN(tipAmount) || tipAmount < 0) {
      setError('Пожалуйста, введите корректную сумму чаевых');
      return;
    }

    if (tipAmount === 0) {
      setError('Пожалуйста, выберите сумму чаевых');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onAddTips(tipAmount);
      setSelectedTip(0);
      setCustomTip('');
      onClose();
    } catch (err) {
      setError('Не удалось добавить чаевые. Попробуйте еще раз.');
      console.error('Error adding tips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTip(0);
    setCustomTip('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tips-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="tips-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Добавить чаевые
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Закрыть"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Заказ №: {orderId}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Сумма заказа: {amount} ₽
          </p>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <p className="text-sm text-green-700">
              💚 Чаевые полностью поступают продавцу и не облагаются налогом
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите сумму чаевых
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {TIP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTipSelect(option.value)}
                  className={`px-4 py-2 text-sm rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedTip === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                  aria-pressed={selectedTip === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="custom-tip"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Или введите свою сумму
            </label>
            <div className="relative">
              <input
                id="custom-tip"
                type="number"
                value={customTip}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                min="0"
                step="1"
                placeholder="0"
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                aria-describedby="custom-tip-error"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₽
              </span>
            </div>
            {error && (
              <p
                id="custom-tip-error"
                className="mt-1 text-sm text-red-600"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || (!selectedTip && !customTip)}
              className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Добавление...' : 'Добавить чаевые'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
