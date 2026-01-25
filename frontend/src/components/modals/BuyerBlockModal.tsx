'use client';

import { useState } from 'react';
import { BuyerBlockModalProps } from '../../lib/types';

export default function BuyerBlockModal({
  buyerId,
  isOpen,
  onClose,
  onBlock,
}: BuyerBlockModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину блокировки');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onBlock(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError('Не удалось заблокировать покупателя. Попробуйте еще раз.');
      console.error('Error blocking buyer:', err);
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
      aria-labelledby="block-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="block-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Заблокировать покупателя
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
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-700">
              ⚠️ Важно: Заблокированный покупатель не сможет делать заказы у вас. Это действие можно отменить в любой момент.
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Покупатель ID: {buyerId}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="block-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Причина блокировки *
            </label>
            <textarea
              id="block-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Укажите причину блокировки покупателя..."
              disabled={isLoading}
              aria-describedby="block-reason-error"
            />
            {error && (
              <p
                id="block-reason-error"
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
              {isLoading ? 'Блокировка...' : 'Заблокировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
