'use client';

import { useState } from 'react';
import { AcceptCorrectionModalProps } from '../../lib/types';

interface AcceptCorrectionModalPropsExtended extends AcceptCorrectionModalProps {
  proposal?: {
    refund_amount?: number;
    partial_refund?: number;
    gift_voucher?: string;
    message: string;
  };
}

export default function AcceptCorrectionModal({
  correctionRequestId,
  isOpen,
  onClose,
  onAccept,
  proposal,
}: AcceptCorrectionModalPropsExtended) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (accept: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      await onAccept(accept);
      onClose();
    } catch (err) {
      setError('Не удалось обработать решение. Попробуйте еще раз.');
      console.error('Error accepting/rejecting correction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-decision-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="correction-decision-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Предложение исправления
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
            Предложение #{correctionRequestId}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              💡 Продавец предлагает компенсацию за неудовлетворительный опыт. Вы можете принять или отклонить это предложение.
            </p>
          </div>
        </div>

        {proposal && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-medium text-gray-900 mb-3">Детали предложения:</h4>
            
            {proposal.refund_amount && (
              <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-700">
                  💰 Полный возврат: {proposal.refund_amount} ₽
                </p>
              </div>
            )}

            {proposal.partial_refund && (
              <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-700">
                  💰 Частичный возврат: {proposal.partial_refund} ₽
                </p>
              </div>
            )}

            {proposal.gift_voucher && (
              <div className="mb-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-700">
                  🎁 Промокод / Подарочный сертификат: {proposal.gift_voucher}
                </p>
              </div>
            )}

            {proposal.message && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Сообщение от продавца
                </p>
                <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">
                  {proposal.message}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Если вы примете:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              {proposal?.refund_amount && (
                <li>✓ Вы получите полный возврат средств</li>
              )}
              {proposal?.partial_refund && (
                <li>✓ Вы получите частичный возврат {proposal.partial_refund} ₽</li>
              )}
              {proposal?.gift_voucher && (
                <li>✓ Вы получите промокод: {proposal.gift_voucher}</li>
              )}
              <li>✓ Продавец сможет улучшить свою оценку</li>
            </ul>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Если вы отклоните:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>✗ Оценка останется без изменений</li>
              <li>✗ Компенсация не будет предоставлена</li>
              <li>✗ Продавец не сможет улучшить оценку</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleDecision(false)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Обработка...' : 'Отклонить'}
          </button>
          <button
            type="button"
            onClick={() => handleDecision(true)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Принятие...' : 'Принять предложение'}
          </button>
        </div>
      </div>
    </div>
  );
}
