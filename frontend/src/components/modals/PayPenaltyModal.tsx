'use client';

import { useState } from 'react';
import { PayPenaltyModalProps } from '../../lib/types';
import { api } from '../../lib/api';

export default function PayPenaltyModal({
  isOpen,
  onClose,
  penalty,
  currentBalance,
  producerId,
  token,
  onPaymentSuccess,
}: PayPenaltyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handlePayPenalty = async () => {
    if (!confirmed) {
      setError('Пожалуйста, подтвердите оплату штрафа');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response: any = await api.producers.payPenalty(
        producerId,
        penalty.order_id,
        token
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      // Success
      onPaymentSuccess();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Не удалось оплатить штраф');
      console.error('Pay penalty error:', err);
    } finally {
      setLoading(false);
    }
  };

  const remainingBalance = currentBalance - penalty.penalty_amount;
  const canAfford = remainingBalance >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-black text-gray-900">Оплата штрафа</h2>
            <p className="text-sm text-gray-500 mt-1">
              Подтвердите оплату штрафа для снятия штрафного очка
            </p>
          </div>

          {/* Penalty Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Заказ:</span>
              <span className="font-mono text-sm font-bold text-gray-900">
                #{penalty.order_id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Стоимость заказа:</span>
              <span className="text-sm font-medium text-gray-900">
                {penalty.order_total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Штраф (30%):</span>
              <span className="text-lg font-black text-red-600">
                {penalty.penalty_amount.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Текущий баланс:</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentBalance.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Баланс после оплаты:</span>
                <span
                  className={`text-sm font-bold ${
                    canAfford ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {remainingBalance.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {!canAfford && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-bold">Недостаточно средств</p>
                  <p className="mt-1">
                    Пополните баланс на{' '}
                    {Math.abs(remainingBalance).toLocaleString('ru-RU')} ₽ для оплаты
                    штрафа.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2 text-sm">✨ Что произойдёт:</h4>
            <ul className="space-y-1 text-xs text-blue-800">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Будет снято 1 штрафное очко</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Автоматический отзыв с 1 звездой будет удалён</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Ваш рейтинг автоматически пересчитается</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Порог бана увеличится с 3 до 4 отказов в текущем месяце</span>
              </li>
            </ul>
          </div>

          {/* Monthly Limitation Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-bold">Ограничение</p>
                <p className="mt-1">
                  Оплата штрафа доступна только 1 раз в месяц. После оплаты следующая
                  возможность будет доступна через месяц.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm-payment"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#c9825b] focus:ring-[#c9825b]"
              disabled={loading || !canAfford}
            />
            <label htmlFor="confirm-payment" className="text-sm text-gray-700 cursor-pointer">
              Я понимаю, что эту операцию можно использовать только 1 раз в месяц, и хочу
              оплатить штраф
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handlePayPenalty}
              disabled={loading || !confirmed || !canAfford}
              className="flex-1 px-6 py-3 bg-[#c9825b] text-white rounded-lg font-bold hover:bg-[#b07350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Оплата...
                </div>
              ) : (
                'Оплатить'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
