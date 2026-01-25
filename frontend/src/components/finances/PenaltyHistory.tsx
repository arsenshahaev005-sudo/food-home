'use client';

import { useState, useEffect } from 'react';
import { PenaltyRecord } from '../../lib/types';
import { api } from '../../lib/api';

interface PenaltyHistoryProps {
  token: string;
}

export default function PenaltyHistory({ token }: PenaltyHistoryProps) {
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    fetchPenalties();
  }, [token]);

  const fetchPenalties = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.producers.getPenaltyHistory();
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить историю штрафов');
      }
      
      const data: PenaltyRecord[] = await response.json();
      setPenalties(data);
    } catch (err) {
      setError('Не удалось загрузить историю штрафов');
      console.error('Error fetching penalty history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason: PenaltyRecord['reason']) => {
    switch (reason) {
      case 'ORDER_REJECTION':
        return 'Отклонение заказа';
      case 'DISPUTE_LOSS':
        return 'Проигрыш в споре';
      case 'LATE_DELIVERY':
        return 'Поздняя доставка';
      case 'CANCELLED_ORDER':
        return 'Отмена заказа';
      default:
        return reason;
    }
  };

  const filteredPenalties = penalties.filter(p => {
    if (filter === 'paid') return p.paid;
    if (filter === 'unpaid') return !p.paid;
    return true;
  });

  const totalPenalties = penalties.reduce((sum, p) => sum + p.amount, 0);
  const paidPenalties = penalties.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const unpaidPenalties = penalties.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-400"
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
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPenalties}
          className="mt-4 px-4 py-2 text-sm font-medium text-[#c9825b] hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Всего штрафов
          </p>
          <p className="text-2xl font-black text-gray-900">
            {totalPenalties.toLocaleString('ru-RU')} ₽
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Оплачено
          </p>
          <p className="text-2xl font-black text-green-600">
            {paidPenalties.toLocaleString('ru-RU')} ₽
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Не оплачено
          </p>
          <p className="text-2xl font-black text-red-600">
            {unpaidPenalties.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'Все' },
          { id: 'paid', label: 'Оплаченные' },
          { id: 'unpaid', label: 'Не оплаченные' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-[#c9825b] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Penalties List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredPenalties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <p className="text-gray-900 font-medium">Штрафов нет</p>
            <p className="text-gray-500 text-sm mt-1">
              {filter === 'all' ? 'У вас нет штрафов' : 
               filter === 'paid' ? 'Нет оплаченных штрафов' : 'Нет неоплаченных штрафов'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Заказ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Причина
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPenalties.map((penalty) => (
                  <tr key={penalty.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">#{penalty.order_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{getReasonLabel(penalty.reason)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-red-600">
                        {penalty.amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(penalty.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {penalty.paid ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Оплачен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm2-4a1 1 0 100-2 1 1 0 0116 0zm4-4a1 1 0 11-2 0 1 1 0 012 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Не оплачен
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="font-bold text-yellow-900 mb-2">💡 Информация о штрафах</h3>
        <ul className="space-y-2 text-yellow-800">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Отклонение заказа: штраф 30% от стоимости заказа</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Проигрыш в споре: штраф в зависимости от решения</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Поздняя доставка: штраф за нарушение SLA</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Отмена заказа: штраф в зависимости от причины</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
