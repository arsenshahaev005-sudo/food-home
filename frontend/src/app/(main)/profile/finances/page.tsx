'use client';

import { useState, useEffect } from 'react';
import { FinancialSummary } from '../../../lib/types';
import { api } from '../../../lib/api';
import CommissionBreakdown from '../../../components/finances/CommissionBreakdown';
import PenaltyHistory from '../../../components/finances/PenaltyHistory';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function FinancesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'penalties'>('overview');

  useEffect(() => {
    const t = getCookie('accessToken');
    if (t) {
      setToken(t);
      fetchSummary(t);
    } else {
      setLoading(false);
      setError('Необходимо войти в аккаунт');
    }
  }, []);

  const fetchSummary = async (authToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.producers.getFinancialSummary();
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить финансовую информацию');
      }
      
      const data: FinancialSummary = await response.json();
      setSummary(data);
    } catch (err) {
      setError('Не удалось загрузить финансовую информацию');
      console.error('Error fetching financial summary:', err);
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
            onClick={() => token && fetchSummary(token)}
            className="btn-warm px-8 py-3 rounded-2xl font-black"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 mb-2">Финансы</h1>
        <p className="text-gray-500 font-medium">
          Отслеживайте свои доходы, комиссии и штрафы
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50">
          <div className="grid grid-cols-3 w-full max-w-md gap-3">
            {[
              { id: 'overview', label: 'Обзор' },
              { id: 'commissions', label: 'Комиссии' },
              { id: 'penalties', label: 'Штрафы' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all rounded-2xl border-2 flex items-center justify-center gap-2 px-4 ${
                  activeTab === tab.id 
                    ? 'bg-white border-[#c9825b] text-[#c9825b] shadow-lg shadow-[#c9825b]/10 scale-[1.02]' 
                    : 'bg-white border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9825b] flex-shrink-0" />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && summary && (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
                  <p className="text-sm text-green-600 font-medium uppercase tracking-wider mb-2">
                    Общая выручка
                  </p>
                  <p className="text-3xl font-black text-green-900">
                    {summary.total_revenue.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                  <p className="text-sm text-blue-600 font-medium uppercase tracking-wider mb-2">
                    Комиссия платформы
                  </p>
                  <p className="text-3xl font-black text-blue-900">
                    {summary.platform_commission.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
                  <p className="text-sm text-purple-600 font-medium uppercase tracking-wider mb-2">
                    Чистая выручка
                  </p>
                  <p className="text-3xl font-black text-purple-900">
                    {summary.net_revenue.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6">
                  <p className="text-sm text-yellow-600 font-medium uppercase tracking-wider mb-2">
                    Полученные чаевые
                  </p>
                  <p className="text-3xl font-black text-yellow-900">
                    {summary.tips_received.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-6">
                  <p className="text-sm text-red-600 font-medium uppercase tracking-wider mb-2">
                    Уплаченные штрафы
                  </p>
                  <p className="text-3xl font-black text-red-900">
                    {summary.penalties_paid.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6">
                  <p className="text-sm text-emerald-600 font-medium uppercase tracking-wider mb-2">
                    Полученные бонусы
                  </p>
                  <p className="text-3xl font-black text-emerald-900">
                    {summary.bonuses_received.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Balance Card */}
              <div className="bg-gradient-to-br from-[#c9825b]/10 to-[#c9825b]/20 border-2 border-[#c9825b]/30 rounded-2xl p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#c9825b] font-medium uppercase tracking-wider mb-2">
                      Текущий баланс
                    </p>
                    <p className="text-4xl font-black text-[#c9825b]">
                      {summary.current_balance.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-[#c9825b] rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 3 2.997V13c0 1.107-.893 2-2 2a1 1 0 01-2-2V5.414c0-1.657.895-3 2-3s-1.343-3-2.997V6c0-1.107.893-2 2-2a1 1 0 012 2v4.586c0 1.107.893 2 2 2a1 1 0 012-2V8.414c0-1.657-.895-3-2-3z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-bold text-blue-900 mb-3">💡 Как формируется баланс</h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Чистая выручка = Общая выручка - Комиссия платформы</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Баланс = Чистая выручка + Чаевые - Штрафы + Бонусы</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Бонусы за повторных покупателей уменьшают комиссию на -1% за каждого</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'commissions' && token && (
            <CommissionBreakdown token={token} />
          )}

          {activeTab === 'penalties' && token && (
            <PenaltyHistory token={token} />
          )}
        </div>
      </div>
    </div>
  );
}
