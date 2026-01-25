'use client';

import { useState, useEffect } from 'react';
import { LateDeliveryAlert } from '../../lib/types';

interface LateDeliveryAlertsProps {
  token: string;
}

export default function LateDeliveryAlerts({ token }: LateDeliveryAlertsProps) {
  const [alerts, setAlerts] = useState<LateDeliveryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'cooking' | 'delivery'>('all');

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll create sample data
      // In a real implementation, you'd fetch actual alert data from API
      setAlerts([]);
    } catch (err) {
      setError('Не удалось загрузить оповещения об опозданиях');
      console.error('Error fetching late delivery alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeLabel = (lateType: LateDeliveryAlert['late_type']) => {
    switch (lateType) {
      case 'COOKING':
        return 'Приготовление';
      case 'DELIVERY':
        return 'Доставка';
      default:
        return lateType;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'cooking') return alert.late_type === 'COOKING';
    if (filter === 'delivery') return alert.late_type === 'DELIVERY';
    return true;
  });

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
          onClick={fetchAlerts}
          className="btn-warm px-8 py-3 rounded-2xl font-black"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 mb-2">Оповещения об опозданиях</h1>
        <p className="text-gray-500 font-medium">
          Отслеживайте опоздания по приготовлению и доставке заказов
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Всего опозданий
          </p>
          <p className="text-3xl font-black text-gray-900">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Штрафы наложены
          </p>
          <p className="text-3xl font-black text-red-600">
            {alerts.filter(a => a.penalty_applied).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Общая сумма штрафов
          </p>
          <p className="text-3xl font-black text-gray-900">
            {alerts.reduce((sum, a) => sum + (a.penalty_amount || 0), 0).toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'Все' },
          { id: 'cooking', label: 'Приготовление' },
          { id: 'delivery', label: 'Доставка' }
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

      {/* Alerts List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-400"
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
            <p className="text-gray-900 font-medium text-xl">Отлично!</p>
            <p className="text-gray-500">
              {filter === 'all' ? 'Нет опозданий' : 
               filter === 'cooking' ? 'Нет опозданий по приготовлению' : 'Нет опозданий по доставке'}
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
                    Тип
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Опоздание
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Срок
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Штраф
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">#{alert.order_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        alert.late_type === 'COOKING'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {getAlertTypeLabel(alert.late_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-red-600">
                          {alert.minutes_late} мин
                        </span>
                        {alert.late_reason && (
                          <span className="text-sm text-gray-500">
                            ({alert.late_reason})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(alert.sla_deadline).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {alert.penalty_applied ? (
                        <div>
                          <span className="font-medium text-red-600">
                            {alert.penalty_amount?.toLocaleString('ru-RU')} ₽
                          </span>
                          {alert.actual_time && (
                            <p className="text-xs text-gray-500 mt-1">
                              Фактическое: {new Date(alert.actual_time).toLocaleString('ru-RU')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Нет</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(alert.late_detected_at || '').toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
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
        <h3 className="font-bold text-yellow-900 mb-2">⚠️ SLA (Service Level Agreement)</h3>
        <ul className="space-y-2 text-yellow-800">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Приготовление: максимум 45 минут после принятия заказа</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Доставка: максимум 60 минут после начала доставки</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Штраф за опоздание: 30% от стоимости заказа</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>Штраф автоматически налагается при нарушении SLA</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
