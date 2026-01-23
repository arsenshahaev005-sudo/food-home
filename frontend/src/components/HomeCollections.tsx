"use client";

import Link from "next/link";

const COLLECTIONS = [
  {
    id: "cozy-dinner",
    title: "Уютный ужин",
    description: "Домашнее тепло в каждой тарелке",
    image: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&q=80",
    color: "bg-orange-50",
    textColor: "text-orange-900",
    buttonColor: "bg-orange-600",
  },
  {
    id: "healthy-start",
    title: "Здоровый старт",
    description: "Зарядитесь энергией на весь день",
    image: "https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&q=80",
    color: "bg-orange-50",
    textColor: "text-orange-900",
    buttonColor: "bg-orange-600",
  },
  {
    id: "festive-table",
    title: "Праздничный стол",
    description: "Сделайте ваш праздник особенным",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
    color: "bg-orange-50",
    textColor: "text-orange-900",
    buttonColor: "bg-orange-600",
  },
  {
    id: "cozy-home",
    title: "Уют для дома",
    description: "Пледы, свечи и декор для тепла",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80",
    color: "bg-orange-50",
    textColor: "text-orange-900",
    buttonColor: "bg-orange-600",
  }
];

export default function HomeCollections() {
  return (
    <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 bg-white rounded-2xl shadow-lg p-6 mb-4 pt-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Подборки для вас</h2>
          <p className="text-gray-500 font-medium mt-1">Вдохновляйтесь нашими тематическими сетами</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COLLECTIONS.map((col) => (
          <Link 
            key={col.id} 
            href={`/dishes?collection=${col.id}`}
            className={`group relative overflow-hidden rounded-[32px] ${col.color} p-6 h-[320px] transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between`}
          >
            <div className="relative z-10 space-y-2">
              <h3 className={`text-2xl font-black ${col.textColor} leading-tight`}>{col.title}</h3>
              <p className={`text-sm font-medium ${col.textColor} opacity-70`}>{col.description}</p>
            </div>

            <div className="absolute bottom-0 right-0 w-full h-1/2 overflow-hidden">
                <img 
                  src={col.image} 
                  alt={col.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 rounded-tl-[64px]"
                />
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white shadow-lg transform group-hover:scale-110 transition-all" style={{ backgroundColor: '#CD845B' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
