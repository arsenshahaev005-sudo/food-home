'use client';

import React from 'react';

export default function SellerFinance() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Финансы</h1>
        <p className="text-gray-500 mt-1">Управление доходами, выплатами и реквизитами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#4b2f23] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-[#4b2f23]/20">
            <div className="relative z-10">
              <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Доступно к выводу</p>
              <div className="text-4xl font-black mb-8">₽ 12,450</div>
              
              <div className="space-y-4">
                <button className="w-full py-4 bg-[#c9825b] hover:bg-[#b07350] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#c9825b]/20">
                  Вывести средства
                </button>
                <div className="text-[10px] text-center text-white/40 uppercase font-bold tracking-tighter">
                  Следующая выплата: 24 декабря
                </div>
              </div>
            </div>
            
            {/* Abstract shapes */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#c9825b]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Детализация</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">В обработке</span>
                <span className="font-bold text-gray-900">₽ 4,200</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Всего заработано</span>
                <span className="font-bold text-gray-900">₽ 156,800</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Удержано (комиссия)</span>
                <span className="font-bold text-gray-400">₽ 15,680</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">История транзакций</h3>
            <button className="text-[#c9825b] text-sm font-bold hover:underline">Скачать отчет</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Дата</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Тип</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Статус</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { date: '20 дек, 14:20', type: 'Продажа #4821', status: 'Зачислено', amount: '+ ₽ 1,240', color: 'text-green-600' },
                  { date: '19 дек, 10:15', type: 'Вывод средств', status: 'Выполнено', amount: '- ₽ 8,000', color: 'text-gray-900' },
                  { date: '18 дек, 18:45', type: 'Продажа #4815', status: 'Зачислено', amount: '+ ₽ 2,150', color: 'text-green-600' },
                  { date: '18 дек, 12:30', type: 'Продажа #4812', status: 'В обработке', amount: '+ ₽ 950', color: 'text-[#c9825b]' },
                  { date: '17 дек, 09:10', type: 'Продажа #4808', status: 'Зачислено', amount: '+ ₽ 3,400', color: 'text-green-600' },
                  { date: '16 дек, 15:20', type: 'Продажа #4805', status: 'Зачислено', amount: '+ ₽ 1,800', color: 'text-green-600' }
                ].map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-gray-900">{tx.date}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-medium text-gray-600">{tx.type}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                        tx.status === 'Зачислено' ? 'bg-green-50 text-green-600' :
                        tx.status === 'Выполнено' ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className={`text-sm font-black ${tx.color}`}>{tx.amount}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-8 bg-gray-50/30 text-center">
            <button className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Показать больше транзакций
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
