'use client';

import { useState, useEffect } from 'react';
import { OrderDispute } from '../../lib/types';
import { api } from '../../lib/api';

interface DisputeHistoryProps {
  orderId: string;
  token: string;
}

export default function DisputeHistory({ orderId, token }: DisputeHistoryProps) {
  const [disputes, setDisputes] = useState<OrderDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [orderId, token]);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.orders.getDisputes(orderId);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить историю споров');
      }
      
      const data: OrderDispute[] = await response.json();
      setDisputes(data);
    } catch (err) {
      setError('Не удалось загрузить историю споров');
      console.error('Error fetching disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: OrderDispute['status']) => {
    switch (status) {
      case 'PENDING':
        return { label: 'На рассмотрении', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
      case 'RESOLVED':
        return { label: 'Решен', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'REJECTED':
        return { label: 'Отклонен', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      default:
        return { label: status, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const getComplainantType = (type: OrderDispute['complainant_type']) => {
    return type === 'BUYER' ? 'Покупатель' : 'Продавец';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDisputes}
            className="mt-4 px-4 py-2 text-sm font-medium text-[#c9825b] hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
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
          <p className="text-gray-900 font-medium">Споров нет</p>
          <p className="text-gray-500 text-sm mt-1">История споров по этому заказу пуста</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">История споров</h3>
      
      <div className="space-y-4">
        {disputes.map((dispute) => {
          const status = getStatusInfo(dispute.status);
          const isExpanded = expandedDispute === dispute.id;

          return (
            <div
              key={dispute.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                isExpanded ? status.border + ' ' + status.bg : 'border-gray-200 bg-gray-50'
              }`}
            >
              <button
                onClick={() => setExpandedDispute(isExpanded ? null : dispute.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    dispute.status === 'PENDING' ? 'bg-yellow-500' :
                    dispute.status === 'RESOLVED' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      Спор #{dispute.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getComplainantType(dispute.complainant_type)} • {new Date(dispute.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color} ${status.bg}`}>
                    {status.label}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Причина
                      </p>
                      <p className="text-gray-900">{dispute.reason}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Инициатор
                        </p>
                        <p className="text-gray-900">{getComplainantType(dispute.complainant_type)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Статус
                        </p>
                        <p className={`font-medium ${status.color}`}>{status.label}</p>
                      </div>
                    </div>

                    {dispute.resolved_at && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Дата решения
                        </p>
                        <p className="text-gray-900">
                          {new Date(dispute.resolved_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {dispute.resolution_notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Примечание к решению
                        </p>
                        <p className="text-gray-900">{dispute.resolution_notes}</p>
                      </div>
                    )}

                    {dispute.penalty_imposed && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-700">
                          ⚠️ Штраф наложен
                        </p>
                        {dispute.penalty_amount && (
                          <p className="text-sm text-red-600 mt-1">
                            Сумма штрафа: {dispute.penalty_amount} ₽
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
