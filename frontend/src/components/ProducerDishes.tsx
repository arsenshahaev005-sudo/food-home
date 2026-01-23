"use client";

import { useState } from "react";
import type { Dish, Category } from "@/lib/api";
import { DishCard } from "@/components/DishCard";
import DishQuickViewModal from "@/components/DishQuickViewModal";

interface ProducerDishesProps {
  dishes: Dish[];
  categories?: Category[];
}

export default function ProducerDishes({ dishes, categories }: ProducerDishesProps) {
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>({});

  const getCategoryName = (catId: string | null | undefined) => {
    if (!catId) return "Без категории";
    const found = categories?.find((c) => c.id === catId);
    return found?.name || "Без категории";
  };

  const topDishes = dishes
    .filter((d) => d.is_top)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  const rest = dishes.filter((d) => !d.is_top);

  const groups: Record<
    string,
    { mainCategoryName: string; subCategoryName: string; dishes: Dish[] }
  > = {};

  if (!categories || categories.length === 0) {
    const simpleGroups = rest.reduce<Record<string, Dish[]>>((acc, dish) => {
      const key = dish.category || "uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(dish);
      return acc;
    }, {});

    Object.entries(simpleGroups).forEach(([key, ds]) => {
      groups[key] = {
        mainCategoryName: getCategoryName(key === "uncategorized" ? null : key),
        subCategoryName: "",
        dishes: ds.sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  } else {
    const idToCategory = new Map<string, Category>();
    const idToRoot = new Map<string, Category>();

    categories.forEach((root) => {
      idToCategory.set(root.id, root);
      idToRoot.set(root.id, root);

      if (root.subcategories && Array.isArray(root.subcategories)) {
        root.subcategories.forEach((sub) => {
          idToCategory.set(sub.id, sub);
          idToRoot.set(sub.id, root);
        });
      }
    });

    rest.forEach((dish) => {
      const catId = dish.category;
      const category = catId ? idToCategory.get(catId) : undefined;
      const root = catId ? idToRoot.get(catId) : undefined;

      const main = root || category;
      const sub = root && category && root.id !== category.id ? category : null;

      const mainId = main?.id ?? "uncategorized";
      const subId = sub?.id ?? "none";
      const key = `${mainId}__${subId}`;

      if (!groups[key]) {
        groups[key] = {
          mainCategoryName: main?.name || "Без категории",
          subCategoryName: sub?.name || (main ? "Без подкатегории" : ""),
          dishes: [],
        };
      }

      groups[key].dishes.push(dish);
    });

    Object.values(groups).forEach((group) => {
      group.dishes.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  const categoryPriority: Record<string, number> = {
    "Выпечка": 1,
    "Горячие блюда": 2,
    "Завтраки": 3,
    "Закуски и салаты": 4,
    "Напитки": 5,
    "Замороженные продукты": 6,
    "Консервация и заготовки": 7,
    "Подарочные наборы": 8,
    "Уют и дом": 9,
    "Красота и уход": 10,
    "Одежда и аксессуары": 11,
    "Хобби и творчество": 12,
    "Для домашних животных": 13,
    "Детское меню": 14,
    "Веган и ПП": 15,
  };

  const sortedGroupsEntries = Object.entries(groups).sort(([, a], [, b]) => {
    const pa = categoryPriority[a.mainCategoryName] ?? 999;
    const pb = categoryPriority[b.mainCategoryName] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.mainCategoryName.localeCompare(b.mainCategoryName);
  });

  const openDish = (dish: Dish) => {
    setSelectedDish(dish);
    setIsModalOpen(true);
  };

  const closeDish = () => {
    setIsModalOpen(false);
  };

  const handleShowMore = (groupKey: string) => {
    setVisibleByGroup((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] || 12) + 12,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      <DishQuickViewModal 
        isOpen={isModalOpen} 
        dishId={selectedDish?.id ?? null} 
        initialDish={selectedDish} 
        onClose={closeDish} 
      />
      
      {topDishes.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-black text-[#4b2f23]">Продавец рекомендует</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {topDishes.map((d) => (
              <li key={d.id}>
                <DishCard dish={d} onOpen={openDish} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sortedGroupsEntries.map(([groupKey, group]) => {
        const visibleCount = visibleByGroup[groupKey] || 12;
        const visibleDishes = group.dishes.slice(0, visibleCount);
        const hasMore = visibleCount < group.dishes.length;
        return (
          <section key={groupKey} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-xl font-black text-[#4b2f23]">{group.mainCategoryName}</h3>
              {group.subCategoryName && (
                <span className="text-sm font-semibold text-[#c9825b]">
                  / {group.subCategoryName}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleDishes.map((d) => (
                <li key={d.id}>
                  <DishCard dish={d} onOpen={openDish} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => handleShowMore(groupKey)}
                  className="group flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#c9825b] text-[#c9825b] rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-[#c9825b] hover:text-white transition-all duration-300 shadow-lg shadow-[#c9825b]/10 hover:shadow-[#c9825b]/20 active:scale-95"
                >
                  Показать ещё
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 group-hover:translate-y-0.5 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
