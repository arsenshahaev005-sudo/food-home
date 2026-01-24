"use client";

import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function SellerHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentView = searchParams.get("view") || "OVERVIEW";
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0";
    router.push("/auth/login");
    router.refresh();
  };

  const tabs = [
    { id: 'PROFILE', label: 'Профиль' },
    { id: 'ORDERS', label: 'Заказы' },
    { id: 'PRODUCTS', label: 'Товары' },
    { id: 'PROGRESS', label: 'Прогресс' },
    { id: 'STATISTICS', label: 'Статистика' },
    { id: 'FINANCE', label: 'Финансы' },
    { id: 'CHAT', label: 'Чат' },
    { id: 'REVIEWS', label: 'Отзывы' },
  ];

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
        <div className="flex items-center justify-between h-16">
          {/* Left Side: Navigation Tabs */}
          <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => {
               const isActive = currentView === tab.id;
               return (
                <Link
                  key={tab.id}
                  href={`/seller?view=${tab.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#c9825b] text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-[#fff5f0] hover:text-[#c9825b]'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side: Logout Button */}
          <div className="flex items-center pl-4 border-l border-gray-200 ml-4">
             <button 
                onClick={handleLogout}
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap"
                style={{
                    backgroundColor: isLogoutHovered ? '#c9825b' : '#ffffff',
                    color: isLogoutHovered ? '#ffffff' : '#4b5563', // #4b5563 is gray-600
                }}
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span>Выйти</span>
             </button>
          </div>
        </div>
      </header>
  );
}
