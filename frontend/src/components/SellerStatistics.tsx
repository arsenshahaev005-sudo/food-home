'use client';

import React, { useState, useEffect } from 'react';
import { getSellerStatistics, SellerStatisticsData } from '@/lib/api';

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
}

export default function SellerStatistics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<SellerStatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = getCookie("accessToken");
        if (token) {
          const stats = await getSellerStatistics(token, timeRange);
          setData(stats);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9825b]"></div>
      </div>
    );
  }

  const rangeLabel =
    timeRange === '24h'
      ? 'за последние 24 часа'
      : timeRange === '7d'
      ? 'за последние 7 дней'
      : timeRange === '30d'
      ? 'за последние 30 дней'
      : 'за всё время';

  const stats = [
    { 
      label: 'Выручка', 
      value: `₽ ${data?.total_revenue.toLocaleString() || 0}`, 
      trend: '+0%', 
      icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' 
    },
    { 
      label: 'Средний чек', 
      value: `₽ ${Math.round(data?.avg_order_value || 0).toLocaleString()}`, 
      trend: '0', 
      icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z' 
    },
    { 
      label: 'Заказы', 
      value: data?.orders_count || 0, 
      trend: '+0%', 
      icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' 
    },
    { 
      label: 'Отменено', 
      value: data?.cancelled_orders_count || 0, 
      trend: '0', 
      icon: 'M6 18 18 6M6 6l12 12' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Статистика и аналитика</h1>
          <p className="text-gray-500 mt-1">
            Отслеживайте показатели вашего магазина в реальном времени.{" "}
            <span className="font-semibold text-gray-700">Период: {rangeLabel}</span>
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          {[
            { id: '24h', label: '24ч' },
            { id: '7d', label: '7д' },
            { id: '30d', label: '30д' },
            { id: 'all', label: 'Все время' }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                timeRange === range.id
                  ? 'bg-[#c9825b] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-green-50 text-green-600' : stat.trend === '0' ? 'bg-gray-50 text-gray-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl font-black text-gray-900">{stat.value}</div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Динамика продаж</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                {rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}
              </p>
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#c9825b]"></div>
                 <span className="text-xs font-bold text-gray-500">Заказы</span>
               </div>
            </div>
          </div>
          <div className="h-80 flex items-end justify-between gap-2 px-2">
            {data?.chart_data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                Нет данных за этот период
              </div>
            ) : (
              data?.chart_data.map((item, i) => {
                const maxRevenue = Math.max(...data.chart_data.map(d => d.revenue), 1);
                const height = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full relative h-full flex items-end">
                      <div 
                        className="w-full bg-[#c9825b] rounded-t-xl transition-all duration-500 group-hover:bg-[#b07350]"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          ₽{item.revenue} ({item.count})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Popular Dishes + Reviews */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Популярные блюда</h3>
            <div className="space-y-6">
              {data?.top_dishes && data.top_dishes.length > 0 ? (
                data.top_dishes.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#c9825b] font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 line-clamp-1">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.count} заказов</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#c9825b]">
                      ₽{Math.round(item.revenue).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">Нет данных</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Отзывы</h3>
            {data && data.reviews_count > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-black text-gray-900">
                      {data.avg_rating_overall.toFixed(1)}
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                      На основе {data.reviews_count} отзывов
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`w-5 h-5 ${
                          star <= Math.round(data.avg_rating_overall)
                            ? 'text-yellow-400'
                            : 'text-gray-200'
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Вкус', value: data.avg_rating_taste },
                    { label: 'Внешний вид', value: data.avg_rating_appearance },
                    { label: 'Сервис', value: data.avg_rating_service },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-xs font-bold uppercase tracking-widest"
                    >
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-gray-900">
                        {item.value.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                Пока нет отзывов
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
