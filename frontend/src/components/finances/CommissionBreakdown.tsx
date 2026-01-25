'use client';

import { useState, useEffect } from 'react';
import { CommissionBreakdown } from '../../lib/types';
import { api } from '../../lib/api';

interface CommissionBreakdownProps {
  token: string;
}

export default function CommissionBreakdown({ token }: CommissionBreakdownProps) {
  const [breakdowns, setBreakdowns] = useState<CommissionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchBreakdowns();
  }, [token]);

  const fetchBreakdowns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll fetch breakdowns for recent orders
      // In a real implementation, you'd have an endpoint to get all breakdowns
      // or fetch breakdown for specific orders
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/orders/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить информацию о комиссиях');
      }
      
      // For demonstration, we'll create sample breakdown data
      // In production, you'd fetch actual breakdown data from the API
      setBreakdowns([]);
    } catch (err) {
      setError('Не удалось загрузить информацию о комиссиях');
      console.error('Error fetching commission breakdowns:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

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
          onClick={fetchBreakdowns}
          className="mt-4 px-4 py-2 text-sm font-medium text-[#c9825b] hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (breakdowns.length === 0) {
    return (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012 2v3M9 5a2 2 0 012-2h2a2 2 0 012 2v3"
            />
          </svg>
        </div>
        <p className="text-gray-900 font-medium">Нет данных о комиссиях</p>
        <p className="text-gray-500 text-sm mt-1">
          Здесь будет отображаться информация о комиссиях по заказам
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Детализация комиссий</h3>
      
      {breakdowns.map((breakdown) => {
        const isExpanded = expandedOrder === breakdown.order_id;
        
        return (
          <div
            key={breakdown.order_id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(breakdown.order_id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#c9825b]/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#c9825b]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012 2v3M9 5a2 2 0 012-2h2a2 2 0 012 2v3"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Заказ #{breakdown.order_id}</p>
                  <p className="text-sm text-gray-500">
                    Сумма: {breakdown.base_amount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
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
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 pt-4 border-t border-gray-200 bg-gray-50/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Базовая сумма</span>
                    <span className="font-medium text-gray-900">
                      {breakdown.base_amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">
                      Базовая комиссия ({breakdown.base_commission_percent}%)
                    </span>
                    <span className="font-medium text-blue-600">
                      {breakdown.base_commission_amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  {breakdown.repeat_customer_bonus_amount !== 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-green-50/50">
                      <span className="text-green-700">
                        Бонус за повторного клиента ({breakdown.repeat_customer_bonus_percent}%)
                      </span>
                      <span className="font-medium text-green-600">
                        {breakdown.repeat_customer_bonus_amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  )}

                  {breakdown.penalty_amount !== 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-red-50/50">
                      <span className="text-red-700">Штраф</span>
                      <span className="font-medium text-red-600">
                        +{breakdown.penalty_amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-3 bg-[#c9825b]/10 px-4 rounded-lg">
                    <span className="font-medium text-[#c9825b]">Итоговая комиссия</span>
                    <span className="font-bold text-[#c9825b] text-lg">
                      {breakdown.final_commission_amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-green-100 border border-green-200 px-4 rounded-lg">
                    <span className="font-medium text-green-700">Чистая прибыль</span>
                    <span className="font-bold text-green-900 text-lg">
                      {breakdown.net_to_seller.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
