'use client';

import React, { useState } from 'react';
import { ReviewCorrectionModalProps, CorrectionProposal } from '../../lib/types';

export default function ReviewCorrectionModal({
  reviewId,
  isOpen,
  onClose,
  onProposeCorrection,
}: ReviewCorrectionModalProps) {
  const [refundType, setRefundType] = useState<'none' | 'full' | 'partial'>('none');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [partialRefund, setPartialRefund] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (refundType === 'none' && !message.trim()) {
      setError('Пожалуйста, выберите тип компенсации или напишите сообщение');
      return;
    }

    if ((refundType === 'full' || refundType === 'partial') && !refundAmount) {
      setError('Пожалуйста, укажите сумму возврата');
      return;
    }

    if (!message.trim()) {
      setError('Пожалуйста, напишите сообщение покупателю');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const proposal: CorrectionProposal = {
        message: message.trim(),
      };

      if (refundType === 'full') {
        proposal.refund_amount = parseFloat(refundAmount);
      } else if (refundType === 'partial') {
        proposal.partial_refund = parseFloat(partialRefund);
      }

      await onProposeCorrection(proposal);

      // Reset form
      setRefundType('none');
      setRefundAmount('');
      setPartialRefund('');
      setMessage('');

      onClose();
    } catch (err) {
      setError('Не удалось отправить предложение. Попробуйте еще раз.');
      console.error('Error proposing correction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRefundType('none');
    setRefundAmount('');
    setPartialRefund('');
    setMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="correction-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Предложить исправление оценки
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
            Отзыв #{reviewId}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              💡 Вы можете предложить покупателю компенсацию за неудовлетворительный опыт, чтобы улучшить оценку.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Тип компенсации
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="refund-type"
                  checked={refundType === 'none'}
                  onChange={() => {
                    setRefundType('none');
                    setError(null);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-gray-900">Только сообщение (без компенсации)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="refund-type"
                  checked={refundType === 'full'}
                  onChange={() => {
                    setRefundType('full');
                    setError(null);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-gray-900">Полный возврат</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="refund-type"
                  checked={refundType === 'partial'}
                  onChange={() => {
                    setRefundType('partial');
                    setError(null);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-gray-900">Частичный возврат</span>
              </label>
            </div>
          </div>

          {refundType === 'full' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <label
                htmlFor="full-refund-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Сумма полного возврата *
              </label>
              <div className="relative">
                <input
                  id="full-refund-amount"
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
            </div>
          )}

          {refundType === 'partial' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <label
                htmlFor="partial-refund-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Сумма частичного возврата *
              </label>
              <div className="relative">
                <input
                  id="partial-refund-amount"
                  type="number"
                  value={partialRefund}
                  onChange={(e) => setPartialRefund(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ₽
                </span>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="correction-message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Сообщение покупателю *
            </label>
            <textarea
              id="correction-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Напишите личное сообщение покупателю..."
              disabled={isLoading}
              aria-describedby="correction-message-error"
            />
          </div>

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
              disabled={isLoading || !message.trim()}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Отправка...' : 'Отправить предложение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
