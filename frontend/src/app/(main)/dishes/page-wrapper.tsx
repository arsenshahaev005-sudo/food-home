'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDishes, type Dish } from '@/lib/api';
import DishFilters from '@/components/DishFilters';
import SavedSearches from '@/components/SavedSearches';
import DishesGrid from './DishesGrid';

interface PageWrapperProps {
  initialData: {
    categories: Array<{ id: string; name: string }>;
    producers: Array<{ id: string; name: string }>;
    dishes: Dish[];
  };
  initialFilters: {
    search?: string;
    category?: string;
    producer?: string;
    section?: string;
  };
}

// Helper function to get cookie value
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ initialData, initialFilters }) => {
  const [dishes, setDishes] = useState<Dish[]>(initialData.dishes);
  const [loading, setLoading] = useState(false);
  const [allFilters, setAllFilters] = useState({
    ...initialFilters,
    cooking_time_from: '',
    cooking_time_to: '',
    calories_from: '',
    calories_to: '',
    proteins_from: '',
    proteins_to: '',
    fats_from: '',
    fats_to: '',
    carbs_from: '',
    carbs_to: ''
  });
  
  const token = getCookie('accessToken');
  
  // Ref для хранения таймера debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Функция для проверки, является ли блюдо "скоро в продаже"
  const isSoon = useCallback((d: Dish) => !d.is_available || Boolean(d.start_sales_at), []);
  
  // Мемоизация фильтрованных списков блюд
  const soonDishes = useMemo(() => dishes.filter((d) => isSoon(d)), [dishes, isSoon]);
  const discountedDishes = useMemo(() => dishes.filter((d) => d.is_available && d.discount_percentage > 0 && !isSoon(d)), [dishes, isSoon]);
  const recommendedDishes = useMemo(() => dishes.filter((d) => d.is_available && d.discount_percentage <= 0 && !isSoon(d)), [dishes, isSoon]);
  
  // Мемоизация текущего списка блюд, заголовка и подзаголовка
  const { currentDishes, currentTitle, currentSubtitle } = useMemo(() => {
    const section = allFilters.section || "all";
    let result: { currentDishes: Dish[]; currentTitle: string; currentSubtitle: string };
    
    if (section === "recommended") {
      result = {
        currentDishes: recommendedDishes,
        currentTitle: "Рекомендованные блюда",
        currentSubtitle: "Подборка самых популярных и уютных блюд."
      };
    } else if (section === "soon") {
      result = {
        currentDishes: soonDishes,
        currentTitle: "Скоро в продаже",
        currentSubtitle: "Блюда, которые скоро появятся в продаже."
      };
    } else if (section === "discounts") {
      result = {
        currentDishes: discountedDishes,
        currentTitle: "Скидки и акции",
        currentSubtitle: "Блюда по специальным ценам и с акциями."
      };
    } else {
      result = {
        currentDishes: dishes,
        currentTitle: "Блюда",
        currentSubtitle: "Все доступные блюда от домашних поваров."
      };
    }
    
    return result;
  }, [allFilters.section, dishes, soonDishes, discountedDishes, recommendedDishes]);
  
  // Мемоизация вкладок
  const tabs = useMemo(() => [
    { key: "all", label: "Все блюда" },
    { key: "recommended", label: "Рекомендованные" },
    { key: "soon", label: "Скоро" },
    { key: "discounts", label: "Скидки и акции" },
  ], []);
  
  // Функция для получения блюд с debounce
  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      // Construct the filters object for API call
      const filters: Record<string, string> = {};
      
      // Basic filters
      if (allFilters.search) filters.search = allFilters.search;
      if (allFilters.category) filters.category = allFilters.category;
      if (allFilters.producer) filters.producer = allFilters.producer;
      
      // New advanced filters
      if (allFilters.cooking_time_from) filters.cooking_time_minutes__gte = allFilters.cooking_time_from;
      if (allFilters.cooking_time_to) filters.cooking_time_minutes__lte = allFilters.cooking_time_to;
      if (allFilters.calories_from) filters.calories__gte = allFilters.calories_from;
      if (allFilters.calories_to) filters.calories__lte = allFilters.calories_to;
      if (allFilters.proteins_from) filters.proteins__gte = allFilters.proteins_from;
      if (allFilters.proteins_to) filters.proteins__lte = allFilters.proteins_to;
      if (allFilters.fats_from) filters.fats__gte = allFilters.fats_from;
      if (allFilters.fats_to) filters.fats__lte = allFilters.fats_to;
      if (allFilters.carbs_from) filters.carbs__gte = allFilters.carbs_from;
      if (allFilters.carbs_to) filters.carbs__lte = allFilters.carbs_to;

      const fetchedDishes = await getDishes(filters);
      setDishes(fetchedDishes);
    } catch (error) {
      console.error('Error fetching dishes:', error);
    } finally {
      setLoading(false);
    }
  }, [allFilters]);
  
  // Debounced версия fetchDishes
  const debouncedFetchDishes = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchDishes();
    }, 500); // 500ms debounce
  }, [fetchDishes]);
  
  // Эффект для загрузки блюд при изменении фильтров с debounce
  useEffect(() => {
    debouncedFetchDishes();
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedFetchDishes]);

  const handleFilterChange = useCallback((newFilters: Record<string, unknown>) => {
    setAllFilters((prev: Record<string, unknown>) => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "#4b2f23" }}>
            {currentTitle}
          </h1>
          <p className="text-sm md:text-base" style={{ color: "#7c6b62" }}>
            {currentSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = allFilters.section === tab.key || (allFilters.section === "all" && tab.key === "all");
            return (
              <button
                key={tab.key}
                onClick={() => handleFilterChange({ section: tab.key })}
                className="btn-warm"
                style={
                  isActive
                    ? { backgroundColor: "#c9825b", color: "#ffffff", height: 36, padding: "0 16px" }
                    : { backgroundColor: "#ffffff", height: 36, padding: "0 16px" }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <DishFilters
        initialFilters={allFilters}
        categories={initialData.categories}
        producers={initialData.producers}
        onFilterChange={handleFilterChange}
      />

      {/* Saved Searches Section */}
      {token && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl">
          <SavedSearches 
            token={token} 
            onSelect={(search) => {
              // query_params is already an object, no need to parse
              handleFilterChange(search.query_params);
            }} 
          />
        </div>
      )}

      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 bg-white rounded-2xl shadow-lg p-6 mb-4 pt-6">
        <div className="flex items-baseline justify-between h-10 md:h-12">
          <h2 className="text-xl md:text-2xl font-semibold">{currentTitle}</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <DishesGrid dishes={currentDishes} />
            {currentDishes.length === 0 && (
              <div className="text-sm md:text-base" style={{ color: "#7c6b62" }}>
                По выбранным фильтрам пока нет блюд. Попробуйте изменить параметры поиска.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default PageWrapper;