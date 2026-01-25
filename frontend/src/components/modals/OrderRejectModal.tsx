'use client';

import { useState } from 'react';
import { OrderRejectModalProps } from '../../lib/types';

export default function OrderRejectModal({
  orderId,
  isOpen,
  onClose,
  onReject,
}: OrderRejectModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину отклонения');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onReject(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError('Не удалось отклонить заказ. Попробуйте еще раз.');
      console.error('Error rejecting order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="reject-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Отклонить заказ
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
          <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
            ⚠️ Предупреждение: Отклонение заказа приведет к штрафу в размере 30% от стоимости заказа.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Причина отклонения *
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Укажите причину отклонения заказа..."
              disabled={isLoading}
              aria-describedby="reject-reason-error"
            />
            {error && (
              <p
                id="reject-reason-error"
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
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Отклонение...' : 'Отклонить заказ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
