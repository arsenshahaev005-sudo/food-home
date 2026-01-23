"use client";

import { Profile } from "@/lib/api";

interface SellerProgressProps {
  profile: Profile;
}

export default function SellerProgress({ profile }: SellerProgressProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Прогресс и уровни</h1>
            <p className="text-gray-500 mt-1">Ваш путь к званию супер-продавца</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Current Level Card */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c9825b] to-[#4b2f23] flex items-center justify-center text-white shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v3.375m9 0h-9.75m15.75-3.375c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v3.375m-3-15.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[#c9825b] uppercase tracking-widest mb-1">Текущий уровень</div>
                                <h2 className="text-2xl font-black text-gray-900">Мастер кухни</h2>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-500">До уровня "Шеф-повар"</span>
                                <span className="text-gray-900">75%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#c9825b] rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <p className="text-xs text-gray-400">Осталось выполнить 4 заказа и получить 2 положительных отзыва</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Заказы', value: '16/20', icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' },
                                { label: 'Отзывы 5★', value: '12/15', icon: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' },
                                { label: 'Срок работы', value: '45 дн', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' }
                            ].map((req, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-2 text-[#c9825b]">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={req.icon} />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{req.label}</span>
                                    </div>
                                    <div className="text-lg font-black text-gray-900">{req.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#c9825b]/5 rounded-full blur-3xl"></div>
                </div>

                {/* Achievements */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Ваши достижения</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: 'Быстрый старт', icon: '🚀', date: '12.11.2025' },
                            { name: 'Топ рейтинга', icon: '👑', date: '01.12.2025' },
                            { name: 'Любимец толпы', icon: '❤️', date: '15.12.2025' },
                            { name: 'Чистая кухня', icon: '✨', date: '20.12.2025' }
                        ].map((ach, i) => (
                            <div key={i} className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-3xl mb-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-help border border-gray-100">
                                    {ach.icon}
                                </div>
                                <div className="text-sm font-bold text-gray-900">{ach.name}</div>
                                <div className="text-[10px] text-gray-400 font-medium">{ach.date}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Benefits Card */}
                <div className="bg-[#4b2f23] rounded-3xl p-8 text-white">
                    <h3 className="text-lg font-bold mb-6">Привилегии уровня</h3>
                    <ul className="space-y-4">
                        {[
                            'Пониженная комиссия (12%)',
                            'Приоритет в поиске',
                            'Значок мастера в профиле',
                            'До 50 товаров в меню'
                        ].map((benefit, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                <div className="w-5 h-5 rounded-full bg-[#c9825b] flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                </div>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                    <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all border border-white/10">
                        Все уровни и бонусы
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Статистика баллов</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Опыт (XP)', value: '1,250', color: 'bg-blue-500' },
                            { label: 'Лояльность', value: '98%', color: 'bg-green-500' },
                            { label: 'Штрафы', value: '0', color: 'bg-red-500' }
                        ].map((stat, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                                    <span>{stat.label}</span>
                                    <span className="text-gray-900">{stat.value}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full">
                                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: '80%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
