'use client';

import React, { useState } from 'react';
import { DeliveryRescheduleModalProps } from '../../lib/types';

export default function DeliveryRescheduleModal({
  orderId,
  isOpen,
  onClose,
  onReschedule,
}: DeliveryRescheduleModalProps) {
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [recipientConsent, setRecipientConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTime) {
      setError('Пожалуйста, выберите новое время доставки');
      return;
    }

    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину переноса');
      return;
    }

    if (!recipientConsent) {
      setError('Необходимо согласие получателя на перенос времени доставки');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onReschedule(new Date(newTime), reason.trim());
      setNewTime('');
      setReason('');
      setRecipientConsent(false);
      onClose();
    } catch (err) {
      setError('Не удалось перенести доставку. Попробуйте еще раз.');
      console.error('Error rescheduling delivery:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewTime('');
    setReason('');
    setRecipientConsent(false);
    setError(null);
    onClose();
  };

  // Get minimum date (today)
  const getMinDateTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="reschedule-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Перенести доставку
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-sm text-yellow-700">
              ⚠️ Важно: Получатель должен согласиться на перенос времени доставки. Если получатель откажется, заказ будет автоматически отменен, а вам будет начислен штраф.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="new-delivery-time"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Новое время доставки *
            </label>
            <input
              id="new-delivery-time"
              type="datetime-local"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              min={getMinDateTime()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="reschedule-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Причина переноса *
            </label>
            <textarea
              id="reschedule-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Укажите причину переноса доставки..."
              disabled={isLoading}
              aria-describedby="reschedule-reason-error"
            />
            {error && (
              <p
                id="reschedule-reason-error"
                className="mt-1 text-sm text-red-600"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={recipientConsent}
                onChange={(e) => setRecipientConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                Я получил согласие получателя на перенос времени доставки
              </span>
            </label>
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
              disabled={isLoading || !newTime || !reason.trim() || !recipientConsent}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Перенос...' : 'Перенести доставку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
