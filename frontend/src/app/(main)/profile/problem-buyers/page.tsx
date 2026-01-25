'use client';

import { useState, useEffect } from 'react';
import { ProblemBuyer } from '../../../lib/types';
import { api } from '../../../lib/api';
import BuyerBlockModal from '../../../components/modals/BuyerBlockModal';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function ProblemBuyersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<ProblemBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<ProblemBuyer | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    const t = getCookie('accessToken');
    if (t) {
      setToken(t);
      fetchBuyers(t);
    } else {
      setLoading(false);
      setError('Необходимо войти в аккаунт');
    }
  }, []);

  const fetchBuyers = async (authToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.producers.getProblemBuyers();
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить список проблемных покупателей');
      }
      
      const data: ProblemBuyer[] = await response.json();
      setBuyers(data);
    } catch (err) {
      setError('Не удалось загрузить список проблемных покупателей');
      console.error('Error fetching problem buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockBuyer = async (buyerId: string, reason: string) => {
    if (!token) return;
    
    try {
      const response = await api.producers.blockBuyer(buyerId, reason);
      
      if (!response.ok) {
        throw new Error('Не удалось заблокировать покупателя');
      }
      
      await fetchBuyers(token);
      setShowBlockModal(false);
      setSelectedBuyer(null);
    } catch (err) {
      alert('Не удалось заблокировать покупателя');
      console.error('Error blocking buyer:', err);
    }
  };

  const handleUnblockBuyer = async (buyerId: string) => {
    if (!token) return;
    
    if (!confirm('Вы уверены, что хотите разблокировать этого покупателя?')) {
      return;
    }
    
    try {
      const response = await api.producers.unblockBuyer(buyerId);
      
      if (!response.ok) {
        throw new Error('Не удалось разблокировать покупателя');
      }
      
      await fetchBuyers(token);
    } catch (err) {
      alert('Не удалось разблокировать покупателя');
      console.error('Error unblocking buyer:', err);
    }
  };

  const openBlockModal = (buyer: ProblemBuyer) => {
    setSelectedBuyer(buyer);
    setShowBlockModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-center py-24">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.716V5.716c0-2.049-1.962-3.716-2.502-3.716H4.938c-.54 0-1.002 1.667-1.002 3.716v8.568c0 2.049.462 3.716 1.002 3.716z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => token && fetchBuyers(token)}
            className="btn-warm px-8 py-3 rounded-2xl font-black"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const blockedCount = buyers.filter(b => b.blocked).length;
  const activeProblematicCount = buyers.filter(b => !b.blocked).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Проблемные покупатели</h1>
          <p className="text-gray-500 font-medium">
            Отслеживайте и управляйте покупателями с проблемными заказами
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4">
            <p className="text-red-700 font-bold text-lg">
              ⚠️ Активные: {activeProblematicCount}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4">
            <p className="text-gray-700 font-bold text-lg">
              🔒 Заблокировано: {blockedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <h3 className="font-bold text-yellow-900 mb-2">⚠️ Важная информация</h3>
        <ul className="space-y-2 text-yellow-800">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Проблемные покупатели - это пользователи с большим количеством споров или отмен заказов</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Вы можете заблокировать таких покупателей, чтобы они не могли делать у вас заказы</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Блокировка работает только для вашего магазина - покупатели могут заказывать у других продавцов</span>
          </li>
        </ul>
      </div>

      {/* Buyers List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {buyers.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-900 font-black text-xl mb-2">Проблемных покупателей нет</p>
            <p className="text-gray-500">
              Отлично! У вас нет покупателей с проблемными заказами
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Покупатель
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Споров
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Отмен
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          buyer.blocked ? 'bg-gray-400' : 'bg-gradient-to-br from-orange-400 to-red-500'
                        }`}>
                          {buyer.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className={`font-medium ${buyer.blocked ? 'text-gray-400' : 'text-gray-900'}`}>
                            {buyer.user_name}
                          </span>
                          {buyer.blocked && (
                            <p className="text-xs text-gray-500 mt-1">
                              Заблокирован {buyer.blocked_at ? new Date(buyer.blocked_at).toLocaleDateString('ru-RU') : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${buyer.dispute_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {buyer.dispute_count}
                        </span>
                        {buyer.dispute_count > 0 && (
                          <span className="w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${buyer.cancellation_count > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {buyer.cancellation_count}
                        </span>
                        {buyer.cancellation_count > 0 && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {buyer.blocked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 01-2 2H5a2 2 0 01-2-2zm5-4V3a2 2 0 012-2h4a2 2 0 012 2v2h-6zm6 4v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2h6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm2-4a1 1 0 100-2 1 1 0 0116 0zm4-4a1 1 0 11-2 0 1 1 0 012 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {buyer.blocked ? (
                          <button
                            onClick={() => handleUnblockBuyer(buyer.id)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium transition-colors"
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            onClick={() => openBlockModal(buyer)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium transition-colors"
                          >
                            Заблокировать
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Block Modal */}
      {selectedBuyer && (
        <BuyerBlockModal
          buyerId={selectedBuyer.id}
          isOpen={showBlockModal}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedBuyer(null);
          }}
          onBlock={handleBlockBuyer}
        />
      )}
    </div>
  );
}
