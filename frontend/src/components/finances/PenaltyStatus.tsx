'use client';

import { useState, useEffect, useMemo } from 'react';
import { PenaltyInfo, RecentPenalty } from '../../lib/types';
import { api } from '../../lib/api';
import PayPenaltyModal from '../modals/PayPenaltyModal';

interface PenaltyStatusProps {
  producerId: string;
  token: string;
}

export default function PenaltyStatus({ producerId, token }: PenaltyStatusProps) {
  const [penaltyInfo, setPenaltyInfo] = useState<PenaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPenalty, setSelectedPenalty] = useState<RecentPenalty | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  // Fetch penalty info
  useEffect(() => {
    loadPenaltyInfo();
  }, [producerId, token]);

  const loadPenaltyInfo = async () => {
    try {
      setLoading(true);
      const info = await api.producers.getPenaltyInfo(producerId, token);
      setPenaltyInfo(info);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить информацию о штрафах');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate ban threshold (3 or 4 based on payment this month)
  const banThreshold = useMemo(() => {
    if (!penaltyInfo || !penaltyInfo.last_penalty_payment_date) return 3;

    const paymentDate = new Date(penaltyInfo.last_penalty_payment_date);
    const now = new Date();
    const isThisMonth =
      paymentDate.getFullYear() === now.getFullYear() &&
      paymentDate.getMonth() === now.getMonth();

    return isThisMonth ? 4 : 3;
  }, [penaltyInfo]);

  // Payment availability
  const paymentAvailable = useMemo(() => {
    if (!penaltyInfo?.next_payment_available_date) return true;
    return new Date(penaltyInfo.next_payment_available_date) <= new Date();
  }, [penaltyInfo]);

  // Days until next payment
  const daysUntilPayment = useMemo(() => {
    if (!penaltyInfo?.next_payment_available_date) return 0;
    const nextDate = new Date(penaltyInfo.next_payment_available_date);
    const now = new Date();
    const diff = nextDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [penaltyInfo]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !penaltyInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        {error || 'Ошибка загрузки'}
      </div>
    );
  }

  // Warning level: green (0 penalties), yellow (1-2), orange (at threshold-1), red (banned)
  const getWarningLevel = () => {
    if (penaltyInfo.is_banned) return 'banned';
    if (penaltyInfo.consecutive_rejections >= banThreshold - 1) return 'critical';
    if (penaltyInfo.consecutive_rejections >= 1) return 'warning';
    return 'safe';
  };

  const warningLevel = getWarningLevel();

  return (
    <div className="space-y-6">
      {/* Ban Alert */}
      {penaltyInfo.is_banned && (
        <div className="bg-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black mb-2">Ваш магазин заблокирован</h3>
              <p className="text-white/90 mb-4">
                Причина: {penaltyInfo.ban_reason || 'Превышен лимит отклоненных заказов'}
              </p>
              <a
                href="mailto:support@food-home.com?subject=Запрос на разбан магазина&body=Здравствуйте! Мой магазин был заблокирован. ID магазина: {producerId}. Прошу рассмотреть возможность разблокировки."
                className="inline-block px-6 py-3 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors"
              >
                Связаться с поддержкой
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      {!penaltyInfo.is_banned && warningLevel === 'critical' && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-xl">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="font-bold text-orange-900 mb-1">
                Предупреждение о блокировке!
              </h4>
              <p className="text-orange-800">
                {penaltyInfo.consecutive_rejections} подряд отклонённых заказа из{' '}
                {banThreshold}. Ещё {banThreshold - penaltyInfo.consecutive_rejections} отказ
                приведёт к автоматической блокировке.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Penalty Points */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Штрафные очки
          </p>
          <p
            className={`text-3xl font-black ${
              penaltyInfo.penalty_points === 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {penaltyInfo.penalty_points}
          </p>
        </div>

        {/* Consecutive Rejections */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Отказов подряд
          </p>
          <div className="flex items-end gap-2">
            <p
              className={`text-3xl font-black ${
                warningLevel === 'safe'
                  ? 'text-green-600'
                  : warningLevel === 'warning'
                  ? 'text-yellow-600'
                  : warningLevel === 'critical'
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`}
            >
              {penaltyInfo.consecutive_rejections}
            </p>
            <p className="text-gray-400 text-lg font-bold mb-1">/ {banThreshold}</p>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                warningLevel === 'safe'
                  ? 'bg-green-500'
                  : warningLevel === 'warning'
                  ? 'bg-yellow-500'
                  : warningLevel === 'critical'
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              }`}
              style={{
                width: `${(penaltyInfo.consecutive_rejections / banThreshold) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Баланс
          </p>
          <p className="text-3xl font-black text-gray-900">
            {penaltyInfo.balance.toLocaleString('ru-RU')} ₽
          </p>
        </div>

        {/* Next Payment */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            След. оплата
          </p>
          {paymentAvailable ? (
            <p className="text-2xl font-black text-green-600">Доступна</p>
          ) : (
            <div>
              <p className="text-2xl font-black text-orange-600">{daysUntilPayment} дн.</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(penaltyInfo.next_payment_available_date!).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Penalties with Pay Button */}
      {penaltyInfo.recent_penalties.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Последние штрафы</h3>
            <p className="text-sm text-gray-500 mt-1">
              Вы можете оплатить штраф для снятия очка и удаления отзыва
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                    Заказ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                    Сумма штрафа
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                    Причина
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">
                    Действие
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {penaltyInfo.recent_penalties.map((penalty) => (
                  <tr key={penalty.order_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">
                      #{penalty.order_id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">
                      {penalty.penalty_amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(penalty.cancelled_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{penalty.penalty_reason}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPenalty(penalty);
                          setShowPayModal(true);
                        }}
                        disabled={
                          !paymentAvailable || penaltyInfo.balance < penalty.penalty_amount
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          !paymentAvailable || penaltyInfo.balance < penalty.penalty_amount
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#c9825b] text-white hover:bg-[#b07350]'
                        }`}
                        title={
                          !paymentAvailable
                            ? `Доступно через ${daysUntilPayment} дн.`
                            : penaltyInfo.balance < penalty.penalty_amount
                            ? 'Недостаточно средств'
                            : 'Оплатить штраф'
                        }
                      >
                        Оплатить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">ℹ️ Как работает система штрафов</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              При отклонении заказа: +1 штрафное очко, штраф 30% от стоимости товара,
              автоматический отзыв с 1 звездой
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              Оплата штрафа: -1 очко, удаление отзыва, улучшение рейтинга. Доступна 1 раз в
              месяц
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              Блокировка: {banThreshold} отказа подряд → автоматический бан. Для разбана
              обратитесь в поддержку
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              Бонус: оплата штрафа в текущем месяце увеличивает порог бана с 3 до 4 отказов
            </span>
          </li>
        </ul>
      </div>

      {/* Pay Penalty Modal */}
      {selectedPenalty && (
        <PayPenaltyModal
          isOpen={showPayModal}
          onClose={() => {
            setShowPayModal(false);
            setSelectedPenalty(null);
          }}
          penalty={selectedPenalty}
          currentBalance={penaltyInfo.balance}
          producerId={producerId}
          token={token}
          onPaymentSuccess={() => {
            setShowPayModal(false);
            setSelectedPenalty(null);
            loadPenaltyInfo(); // Refresh data
          }}
        />
      )}
    </div>
  );
}
