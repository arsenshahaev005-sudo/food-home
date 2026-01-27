"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getFavorites, removeFromFavorites } from "@/lib/api/favorites";
import { Dish } from "@/types/api";
import { DishCard } from "@/components/DishCard";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from cookie
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];
    
    if (token) {
      setToken(token);
      fetchFavorites(token);
    } else {
      setError("Для просмотра избранного необходимо авторизоваться");
      setLoading(false);
    }
  }, []);

  const fetchFavorites = async (authToken: string) => {
    try {
      setLoading(true);
      const data = await getFavorites(authToken);
      setFavorites(data);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError("Ошибка при загрузке избранных блюд");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (dishId: string) => {
    if (!token) return;

    try {
      await removeFromFavorites(dishId, token);
      setFavorites(prev => prev.filter(dish => dish.id !== dishId));
    } catch (err) {
      console.error("Error removing from favorites:", err);
      alert("Ошибка при удалении из избранного");
    }
  };

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-black text-gray-900 mb-4">Избранное</h1>
        <p className="text-gray-500 mb-8">Для просмотра избранных блюд необходимо войти в аккаунт</p>
        <Link href="/auth/login" className="btn-warm px-8 py-3 rounded-2xl font-black">
          Войти
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Избранное</h1>
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка избранных блюд...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-black text-gray-900 mb-4">Избранное</h1>
        <p className="text-red-500 mb-8">{error}</p>
        <Link href="/dishes" className="btn-warm px-8 py-3 rounded-2xl font-black">
          Перейти к блюдам
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900">Избранное</h1>
          <p className="text-gray-500 font-medium mt-1">
            {favorites.length} {getPluralForm(favorites.length, 'блюдо', 'блюда', 'блюд')}
          </p>
        </div>
        <Link href="/dishes" className="text-sm font-black text-[#c9825b] hover:underline flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Вернуться к блюдам
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-24 space-y-6">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M4.318 6.318a4.5 4.5 0 0 0 1.964 1.964l12.727 3.04a3 3 0 0 1 0 5.858l-12.727 3.04a4.5 4.5 0 0 1-1.964-1.964l-1.17-2.5a3 3 0 0 1 1.056-3.64l1.07-1.07-1.07-1.07a3 3 0 0 1-1.056-3.64l1.17-2.5Z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-900 font-black text-xl">Избранное пусто</p>
            <p className="text-gray-500 text-base mt-2">Добавьте блюда в избранное, чтобы они отображались здесь</p>
          </div>
          <Link href="/dishes" className="btn-warm inline-flex px-8 py-3 rounded-2xl font-black">
            Перейти к блюдам
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((dish) => (
            <div key={dish.id} className="relative">
              <DishCard
                dish={dish}
                onOpen={() => {
                  // Navigate to dish detail page
                  window.location.href = `/dishes/${dish.id}`;
                }}
              />
              {/* Remove from favorites button */}
              <button
                onClick={() => handleRemoveFromFavorites(dish.id)}
                className="absolute top-3 right-12 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-red-500 hover:text-red-700 transition-colors shadow-md z-10"
                aria-label="Удалить из избранного"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H6.74a3 3 0 0 1-2.991-2.77L2.745 5.98 1.74 5.945a.75.75 0 0 1-.256-1.478l.209.035a.75.75 0 0 1 .085.756c.2-.224.45-.42.73-.58.7-.4-.6 1.2 1.5 1.2h10.5c1.1 0 2.2-.8 1.5-1.2-.28-.16-.53-.357-.73-.581a.75.75 0 0 1 .085-.756Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get correct plural form
function getPluralForm(count: number, singular: string, plural: string, plural2: string): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return plural2;
  }
  
  if (lastDigit === 1) {
    return singular;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return plural;
  }
  
  return plural2;
}