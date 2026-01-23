/**
 * Компонент карточки реферальной программы.
 * 
 * Обоснование: Система реферальных бонусов
 * стимулирует пользователей привлекать новых клиентов.
 */

import React from 'react';
import { ReferralStats as ReferralStatsType } from '@/lib/api/referralApi';

interface ReferralCardProps {
  stats: ReferralStatsType;
  referralLink: string;
  onCopyLink: () => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  stats,
  referralLink,
  onCopyLink,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    onCopyLink();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Реферальная программа
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-md p-4">
          <p className="text-sm text-gray-600 mb-1">Всего заработано</p>
          <p className="text-2xl font-bold text-blue-600">
            {parseFloat(stats.total_earned).toFixed(2)} ₽
          </p>
        </div>
        <div className="bg-green-50 rounded-md p-4">
          <p className="text-sm text-gray-600 mb-1">Успешных рефералов</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.successful_referrals}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-md p-4">
          <p className="text-sm text-gray-600 mb-1">Ожидают</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.pending_referrals}
          </p>
        </div>
        <div className="bg-purple-50 rounded-md p-4">
          <p className="text-sm text-gray-600 mb-1">В ожидании</p>
          <p className="text-2xl font-bold text-purple-600">
            {parseFloat(stats.pending_amount).toFixed(2)} ₽
          </p>
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-gray-50 rounded-md p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          Ваша реферальная ссылка
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none"
            aria-label="Реферальная ссылка"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Копировать ссылку"
            type="button"
          >
            Копировать
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Поделитесь ссылкой с друзьями и получите бонусы за каждого приглашенного пользователя!
        </p>
      </div>

      {/* How it works */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Как это работает?
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>
            Поделитесь своей реферальной ссылкой с друзьями
          </li>
          <li>
            Друг регистрируется по вашей ссылке
          </li>
          <li>
            Друг делает первый заказ — вы получаете бонус
          </li>
          <li>
            Ваш друг также получает бонус за регистрацию
          </li>
        </ol>
      </div>
    </div>
  );
};
