"use client";

import { Profile, Order, getOrders } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SellerOverviewProps {
  profile: Profile;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export default function SellerOverview({ profile }: SellerOverviewProps) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const token = getCookie("accessToken");
    if (token) {
      getOrders(token)
        .then((orders) => {
          // Recent 3 orders - prioritize WAITING_FOR_ACCEPTANCE, then by date desc
          const sorted = [...orders].sort((a, b) => {
            if (a.status === 'WAITING_FOR_ACCEPTANCE' && b.status !== 'WAITING_FOR_ACCEPTANCE') return -1;
            if (a.status !== 'WAITING_FOR_ACCEPTANCE' && b.status === 'WAITING_FOR_ACCEPTANCE') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setRecentOrders(sorted.slice(0, 3));
          
          // Calculate stats
          const completed = orders.filter(o => o.status === 'COMPLETED');
          const revenue = completed.reduce((acc, o) => acc + parseFloat(o.total_price), 0);
          setTotalRevenue(revenue);
          
          const active = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length;
          setActiveOrdersCount(active);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const stats = [
    {
      label: "Активные заказы",
      value: activeOrdersCount.toString(),
      change: activeOrdersCount > 0 ? "+1" : "0",
      isPositive: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.799H3.03a.75.75 0 0 1-.747-.799l1.112-16.835a.75.75 0 0 1 .747-.707H19.01a.75.75 0 0 1 .747.707Z" />
        </svg>
      ),
      color: "blue",
    },
    {
      label: "Выручка (за все время)",
      value: `${Math.round(totalRevenue).toLocaleString('ru-RU')} ₽`,
      change: "+12%",
      isPositive: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: "green",
    },
    {
      label: "Просмотры профиля",
      value: "1,284",
      change: "+5.4%",
      isPositive: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
      color: "purple",
    },
    {
      label: "Рейтинг",
      value: (profile as any).rating?.toString() || "4.9",
      change: "+0.1",
      isPositive: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
      color: "yellow",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Добро пожаловать, {profile.shop_name || profile.first_name}! 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Вот что происходит с вашим магазином сегодня, {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${!profile.is_hidden ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${!profile.is_hidden ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            <span className="text-sm font-black text-gray-700 uppercase tracking-widest">{!profile.is_hidden ? 'Магазин открыт' : 'Магазин закрыт'}</span>
          </div>
          <Link 
            href="/seller?view=PRODUCTS"
            className="bg-[#c9825b] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Добавить товар
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.isPositive ? '↑' : '↓'} {stat.change}
              </div>
            </div>
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sales Chart Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-900">Динамика продаж</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">За последние 7 дней</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#c9825b]"></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">Выручка</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">Заказы</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-3 px-2">
              {[35, 45, 30, 65, 40, 85, 55].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer">
                  <div className="w-full relative">
                    <div 
                      className="w-full bg-gray-50 rounded-t-xl group-hover:bg-[#fff5f0] transition-all duration-300"
                      style={{ height: `${h + 15}%` }}
                    ></div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-[#c9825b] rounded-t-xl transition-all duration-500 group-hover:bg-[#b07350]"
                      style={{ height: `${h}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-xl">Последние заказы</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Оперативная информация</p>
              </div>
              <Link href="/seller?view=ORDERS" className="text-[#c9825b] text-xs font-black uppercase tracking-widest hover:text-[#b07350] transition-colors">Все заказы</Link>
            </div>
            
            {loading ? (
                <div className="p-8 space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : recentOrders.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.799H3.03a.75.75 0 0 1-.747-.799l1.112-16.835a.75.75 0 0 1 .747-.707H19.01a.75.75 0 0 1 .747.707Z" />
                        </svg>
                    </div>
                    <p className="text-gray-900 font-black uppercase tracking-widest text-sm">Пока нет новых заказов</p>
                    <p className="text-xs text-gray-400 font-bold mt-2">Как только кто-то сделает заказ, он появится здесь.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {recentOrders.map((order) => (
                        <div key={order.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                    {order.dish.photo && <img src={order.dish.photo} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 group-hover:text-[#c9825b] transition-colors">{order.dish.name}</div>
                                    <div className="text-xs font-bold text-gray-500 mt-1">{order.user_name} • <span className="text-[#c9825b]">{Math.round(parseFloat(order.total_price))} ₽</span></div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                    order.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 
                                    order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                    {order.status === 'COMPLETED' ? 'Выполнен' : 
                                     order.status === 'CANCELLED' ? 'Отменен' : 'В работе'}
                                </span>
                                <div className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">
                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        {/* Sidebar area */}
        <div className="space-y-8">
          {/* Today's Summary Card */}
          <div className="bg-[#4b2f23] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-[#4b2f23]/20">
            <div className="relative z-10">
              <h3 className="font-black uppercase tracking-widest text-xs mb-6 text-white/60">Сводка за сегодня</h3>
              <div className="space-y-6">
                {[
                  { label: "Новые заказы", value: "3", icon: "📦" },
                  { label: "Выручка", value: "₽ 4,250", icon: "💰" },
                  { label: "Посетители", value: "42", icon: "👥" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">{item.label}</span>
                    </div>
                    <span className="font-black text-lg">{item.value}</span>
                  </div>
                ))}
              </div>
              <Link 
                href="/seller?view=STATISTICS"
                className="block w-full mt-8 py-4 bg-white text-[#4b2f23] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all active:scale-[0.98] text-center"
              >
                Подробный отчет
              </Link>
            </div>
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9825b]/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h3 className="font-black text-gray-900 text-lg mb-6 uppercase tracking-tight">Быстрые действия</h3>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Меню", icon: "📜", href: "/seller?view=PRODUCTS" },
                    { label: "Финансы", icon: "💳", href: "/seller?view=FINANCE" },
                    { label: "Чат", icon: "💬", href: "/seller?view=CHAT" },
                    { label: "Помощь", icon: "🆘", href: "/seller?view=CHAT&orderId=support" },
                ].map((action, idx) => (
                    <Link 
                      key={idx} 
                      href={action.href}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-50 hover:border-[#c9825b]/20 hover:bg-[#fff5f0] transition-all group"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                        <span className="font-black text-[10px] text-gray-500 uppercase tracking-widest group-hover:text-[#c9825b]">{action.label}</span>
                    </Link>
                ))}
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Прогресс</h3>
                <span className="text-[10px] font-black text-[#c9825b] bg-[#fff5f0] px-3 py-1.5 rounded-xl uppercase tracking-widest">LVL 2</span>
            </div>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                        <span className="text-gray-400">До Шеф-повара</span>
                        <span className="text-gray-900">75%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-gradient-to-r from-[#c9825b] to-[#4b2f23] rounded-full transition-all duration-1000" style={{ width: '75%' }}></div>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                  <div className="text-blue-500 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                  </div>
                  <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase tracking-tighter">
                    Выполните еще 5 заказов, чтобы получить статус "Проверенный повар" и сниженную комиссию.
                  </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
