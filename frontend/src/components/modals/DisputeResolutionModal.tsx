'use client';

import React, { useState } from 'react';
import { DisputeResolutionModalProps, DisputeResolution } from '../../lib/types';

export default function DisputeResolutionModal({
  disputeId,
  orderId,
  isOpen,
  onClose,
  onResolve,
}: DisputeResolutionModalProps) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [penaltyPaid, setPenaltyPaid] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (accepted === null) {
      setError('Пожалуйста, выберите решение');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resolution: DisputeResolution = {
        accepted,
        penalty_paid: accepted ? undefined : penaltyPaid,
        refund_amount: accepted && refundAmount ? parseFloat(refundAmount) : undefined,
      };

      await onResolve(resolution);
      
      // Reset form
      setAccepted(null);
      setPenaltyPaid(false);
      setRefundAmount('');
      
      onClose();
    } catch (err) {
      setError('Не удалось разрешить спор. Попробуйте еще раз.');
      console.error('Error resolving dispute:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAccepted(null);
    setPenaltyPaid(false);
    setRefundAmount('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="dispute-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Разрешение спора
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
            Спор #{disputeId}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Заказ №: {orderId}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              ℹ️ Выберите решение для данного спора. Это действие нельзя отменить.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ваше решение *
            </label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="dispute-resolution"
                  checked={accepted === true}
                  onChange={() => {
                    setAccepted(true);
                    setError(null);
                  }}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                  disabled={isLoading}
                />
                <div>
                  <span className="font-medium text-gray-900">Принять претензию</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Вы признаете, что претензия обоснована. Может потребоваться компенсация покупателю.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="dispute-resolution"
                  checked={accepted === false}
                  onChange={() => {
                    setAccepted(false);
                    setError(null);
                  }}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  disabled={isLoading}
                />
                <div>
                  <span className="font-medium text-gray-900">Отклонить претензию</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Вы считаете претензию необоснованной. Может быть наложен штраф.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {accepted === true && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <label
                htmlFor="refund-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Сумма возврата (опционально)
              </label>
              <div className="relative">
                <input
                  id="refund-amount"
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ₽
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Оставьте пустым, если возврат не требуется
              </p>
            </div>
          )}

          {accepted === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={penaltyPaid}
                  onChange={(e) => setPenaltyPaid(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  disabled={isLoading}
                />
                <div>
                  <span className="font-medium text-gray-900">Штраф оплачен</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Подтвердите, что штраф за необоснованную претензию был оплачен
                  </p>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
              disabled={isLoading || accepted === null}
              className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                accepted === true
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : accepted === false
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-gray-400'
              }`}
            >
              {isLoading ? 'Сохранение...' : accepted === true ? 'Принять' : 'Отклонить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
