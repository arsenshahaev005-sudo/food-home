import React, { useState, useEffect } from 'react';
import { Star, Gift, TrendingUp, Award, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { getLoyaltyStats, LoyaltyStats } from '@/lib/api/loyaltyApi';

interface LoyaltyCardProps {
  token: string;
  onRedeemPoints?: () => void;
}

const LoyaltyCard = ({ token, onRedeemPoints }: LoyaltyCardProps) => {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState<number>(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  useEffect(() => {
    loadStats();
  }, [token]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statsData = await getLoyaltyStats(token);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading loyalty stats:', err);
      setError('Не удалось загрузить информацию о лояльности. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (redeemAmount <= 0 || !stats) return;

    setIsRedeeming(true);
    setError(null);

    try {
      // TODO: Implement actual API call to redeem points
      // const result = await redeemLoyaltyDiscount(redeemAmount, token);
      
      setRedeemSuccess(true);
      setTimeout(() => {
        setRedeemSuccess(false);
        setShowRedeemModal(false);
        setRedeemAmount(0);
        loadStats();
        onRedeemPoints?.();
      }, 2000);
    } catch (err: any) {
      console.error('Error redeeming points:', err);
      setError('Не удалось погасить баллы. Пожалуйста, попробуйте позже.');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-600">Загрузка информации о лояльности...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || 'Не удалось загрузить информацию'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Программа лояльности</h2>
            <p className="text-orange-100 text-sm">Получайте бонусы за каждый заказ</p>
          </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Points Card */}
        <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
              <span className="text-lg font-semibold text-gray-900">Баллы</span>
            </div>
            <button
              onClick={() => setShowRedeemModal(true)}
              disabled={stats.current_level.min_points === 0}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Погасить
            </button>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {stats.current_level.min_points.toLocaleString('ru-RU')}
          </div>
          <p className="text-sm text-gray-600">
            {stats.next_level
              ? `До следующего уровня: ${stats.points_to_next_level.toLocaleString('ru-RU')} баллов`
              : 'Вы достигли максимального уровня!'}
          </p>
        </div>

        {/* Progress Bar */}
        {stats.next_level && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{stats.current_level.name}</span>
              <span className="text-sm text-gray-500">{stats.next_level.name}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.progress_percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1 text-right">{stats.progress_percentage.toFixed(1)}%</p>
          </div>
        )}

        {/* Current Level Benefits */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            Ваш уровень: {stats.current_level.name}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Скидка {stats.current_level.discount_percentage}%
              </span>
            </div>
            {stats.current_level.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600">Всего заработано</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_earned.toLocaleString('ru-RU')}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-600">Погашено</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_redeemed.toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      {/* Redeem Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Погасить баллы</h3>
            
            <div className="mb-4">
              <label htmlFor="redeem-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Количество баллов
              </label>
              <input
                type="number"
                id="redeem-amount"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(Number(e.target.value))}
                min="0"
                max={stats.current_level.min_points}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Введите количество баллов"
              />
              <p className="text-xs text-gray-600 mt-1">
                Доступно: {stats.current_level.min_points.toLocaleString('ru-RU')} баллов
              </p>
            </div>

            {redeemSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">Баллы успешно погашены!</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setRedeemAmount(0);
                  setRedeemSuccess(false);
                }}
                disabled={isRedeeming}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleRedeemPoints}
                disabled={isRedeeming || redeemAmount <= 0}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"
              >
                {isRedeeming ? 'Погашение...' : 'Погасить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyCard;
