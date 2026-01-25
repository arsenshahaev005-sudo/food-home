'use client';

import { useState, useEffect } from 'react';
import { RepeatCustomer } from '../../../lib/types';
import { api } from '../../../lib/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function RepeatCustomersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [customers, setCustomers] = useState<RepeatCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getCookie('accessToken');
    if (t) {
      setToken(t);
      fetchCustomers(t);
    } else {
      setLoading(false);
      setError('Необходимо войти в аккаунт');
    }
  }, []);

  const fetchCustomers = async (authToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.producers.getRepeatCustomers();
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить список повторных покупателей');
      }
      
      const data: RepeatCustomer[] = await response.json();
      setCustomers(data);
    } catch (err) {
      setError('Не удалось загрузить список повторных покупателей');
      console.error('Error fetching repeat customers:', err);
    } finally {
      setLoading(false);
    }
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
            onClick={() => token && fetchCustomers(token)}
            className="btn-warm px-8 py-3 rounded-2xl font-black"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const totalBonus = customers.filter(c => c.bonus_applied).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Повторные покупатели</h1>
          <p className="text-gray-500 font-medium">
            Отслеживайте покупателей, которые делают повторные заказы
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4">
          <p className="text-green-700 font-bold text-lg">
            🎉 Бонус комиссии: -{totalBonus}%
          </p>
          <p className="text-green-600 text-sm mt-1">
            -1% за каждого повторного покупателя
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Всего покупателей
          </p>
          <p className="text-3xl font-black text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            С бонусом
          </p>
          <p className="text-3xl font-black text-green-600">{totalBonus}%</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
            Общая выручка
          </p>
          <p className="text-3xl font-black text-gray-900">
            {customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {customers.length === 0 ? (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-gray-900 font-black text-xl mb-2">Повторных покупателей нет</p>
            <p className="text-gray-500">
              Когда покупатели будут делать повторные заказы, они появятся здесь
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
                    Заказов
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Всего потрачено
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Последний заказ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Бонус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{customer.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{customer.total_orders}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {customer.total_spent.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(customer.last_order_date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {customer.bonus_applied ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          -1%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
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
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">💡 Как работает бонус</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Каждый покупатель, сделавший повторный заказ, дает вам бонус -1% к комиссии</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Бонус применяется автоматически ко всем будущим заказам от этого покупателя</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Максимальный бонус не ограничен - чем больше повторных покупателей, тем больше ваша экономия</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
