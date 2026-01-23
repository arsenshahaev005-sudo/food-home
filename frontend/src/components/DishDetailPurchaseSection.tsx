"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/CartActions";
import type { Dish } from "@/lib/api";

function formatNumber(value?: number | string | null) {
  if (value === null || value === undefined) return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

type ToppingAny = any;

export default function DishDetailPurchaseSection({ dish, token }: { dish: Dish; token?: string }) {
  const [selectedToppings, setSelectedToppings] = useState<ToppingAny[]>([]);

  const toppings = useMemo(() => {
    if (dish.toppings && dish.toppings.length > 0) {
      return dish.toppings as ToppingAny[];
    }
    if (!dish.fillings) return [] as ToppingAny[];
    return dish.fillings
      .split(",")
      .map((raw, index) => {
        const name = raw.trim();
        if (!name) return null;
        return { id: `filling-${index}`, name, price: 0 };
      })
      .filter((x): x is ToppingAny => Boolean(x));
  }, [dish.fillings, dish.toppings]);

  const basePrice = useMemo(() => {
    const price = Number(dish.price);
    if (!Number.isFinite(price)) return null;
    if (dish.discount_percentage > 0) {
      return Math.round(price * (1 - dish.discount_percentage / 100));
    }
    return Math.round(price);
  }, [dish.discount_percentage, dish.price]);

  const totalPrice = useMemo(() => {
    if (basePrice === null) return null;
    const toppingsPrice = selectedToppings.reduce((acc, t) => acc + Number(t.price || 0), 0);
    return basePrice + toppingsPrice;
  }, [basePrice, selectedToppings]);

  const toggleTopping = (topping: ToppingAny) => {
    setSelectedToppings((prev) => {
      const exists = prev.find((t) => t.id === topping.id);
      if (exists) {
        return [];
      }
      return [topping];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-2xl md:text-3xl font-black text-[#c9825b]">
          {totalPrice !== null ? `${formatNumber(totalPrice)} ₽` : "—"}
        </div>
        {dish.discount_percentage > 0 && basePrice !== null && (
          <div className="flex items-center gap-2 text-sm md:text-base">
            <span className="text-gray-400 line-through font-medium">
              {formatNumber(dish.price)} ₽
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "#fde4d4", color: "#c9825b" }}>
              −{dish.discount_percentage}%
            </span>
          </div>
        )}
      </div>

      {dish.min_quantity > 1 && (
        <div className="mb-2 p-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium border border-orange-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>Минимальное количество для заказа: {dish.min_quantity} шт.</span>
        </div>
      )}

      {toppings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Выберите начинку</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {toppings.map((topping: ToppingAny) => {
              const isSelected = selectedToppings.some((t) => t.id === topping.id);
              return (
                <button
                  key={topping.id}
                  type="button"
                  onClick={() => toggleTopping(topping)}
                  className={[
                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                    isSelected ? "bg-[#fdf2e9] border-[#c9825b] shadow-sm" : "bg-gray-50 border-gray-100 hover:bg-gray-100",
                  ].join(" ")}
                >
                  <div className="flex flex-col">
                    <span className={["font-bold text-sm", isSelected ? "text-[#c9825b]" : "text-gray-900"].join(" ")}>
                      {topping.name}
                    </span>
                    <span className="text-xs text-gray-500">+{formatNumber(topping.price)} ₽</span>
                  </div>
                  <div
                    className={[
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-[#c9825b] border-[#c9825b]" : "border-gray-300",
                    ].join(" ")}
                  >
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <AddToCartButton
          dish={dish.id}
          labelPrice={totalPrice !== null ? String(totalPrice) : undefined}
          minQuantity={dish.min_quantity}
          maxQuantityPerOrder={dish.max_quantity_per_order}
          token={token}
          selectedToppings={selectedToppings}
        />
      </div>
    </div>
  );
}
