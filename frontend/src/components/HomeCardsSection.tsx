"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import type { Category, Dish } from "@/lib/api";
import CategoriesMegaMenu from "@/components/CategoriesMegaMenu";
import DishQuickViewModal from "@/components/DishQuickViewModal";
import { DishCard, DishCardPlaceholder } from "@/components/DishCard";

export default function HomeCardsSection({
  categories,
  recommended,
  discountedDishes,
  soonDishes,
  catPlaceholder,
  subcatsPlaceholder,
  recPlaceholderTop,
  recPlaceholderMore,
  promosPlaceholder,
}: {
  categories: Category[];
  recommended: Dish[];
  discountedDishes: Dish[];
  soonDishes: Dish[];
  catPlaceholder: string[];
  subcatsPlaceholder: Record<string, string[]>;
  recPlaceholderTop: { name: string; price: string }[];
  recPlaceholderMore: { name: string; price: string }[];
  promosPlaceholder: { name: string; price: string; badge: string }[];
}) {
  const [selected, setSelected] = useState<Dish | null>(null);
  const [open, setOpen] = useState(false);

  const openDish = useCallback((dish: Dish) => {
    setSelected(dish);
    setOpen(true);
  }, []);

  const closeDish = useCallback(() => setOpen(false), []);

  const discounted = useMemo(() => discountedDishes.filter((d) => d.discount_percentage > 0), [discountedDishes]);
  const soon = useMemo(() => {
    return soonDishes.filter((d) => !d.is_available || Boolean(d.start_sales_at));
  }, [soonDishes]);

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("выпечка") || n.includes("хлеб") || n.includes("булочк")) return "🥐";
    if (n.includes("торт")) return "🎂";
    if (n.includes("десерт") || n.includes("печенье") || n.includes("кекс")) return "🧁";
    if (n.includes("завтрак") || n.includes("каши") || n.includes("яичниц")) return "🍳";
    if (n.includes("блины") || n.includes("оладьи") || n.includes("сырник")) return "🥞";
    if (n.includes("суп")) return "🥣";
    if (n.includes("обед")) return "🍱";
    if (n.includes("закуск") || n.includes("бутерброд")) return "🍟";
    if (n.includes("горяч") || n.includes("мясн") || n.includes("рыбн")) return "🥘";
    if (n.includes("плов") || n.includes("паста") || n.includes("лапша")) return "🍝";
    if (n.includes("салат")) return "🥗";
    if (n.includes("напит") || n.includes("сок") || n.includes("лимонад") || n.includes("квас")) return "🍹";
    if (n.includes("чай") || n.includes("кофе")) return "☕";
    if (n.includes("заморож") || n.includes("пельмен") || n.includes("вареник") || n.includes("хинкал")) return "❄️";
    if (n.includes("консерв") || n.includes("варенье") || n.includes("соленье") || n.includes("мед")) return "🍯";
    if (n.includes("праздник")) return "🎉";
    if (n.includes("детск")) return "👶";
    if (n.includes("веган") || n.includes(" пп")) return "🥦";
    if (n.includes("плед") || n.includes("текстиль")) return "🧣";
    if (n.includes("ночник") || n.includes("светильник") || n.includes("свет")) return "💡";
    if (n.includes("аромат") || n.includes("свечи")) return "🕯️";
    if (n.includes("декор") || n.includes("вазы")) return "🏺";
    if (n.includes("подар")) return "🎁";
    if (n.includes("уют") || n.includes("дом")) return "🏠";
    if (n.includes("вяза") || n.includes("шерсть")) return "🧶";
    if (n.includes("посуд")) return "🍽️";
    return "🍴";
  };

  return (
    <>
      <DishQuickViewModal isOpen={open} dishId={selected?.id ?? null} initialDish={selected} onClose={closeDish} />

      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 bg-white rounded-2xl shadow-lg p-6 mb-4 pt-6">
        <div className="grid md:grid-cols-12 gap-8 items-start" style={{ ["--dish-card-h"]: "320px" } as CSSProperties}>
          <div className="md:col-span-6" style={{ ["--cat-gap"]: "0.75rem", ["--cat-btn-h"]: "calc((var(--dish-card-h) - 20px) / 2)" } as CSSProperties}>
            <CategoriesMegaMenu categories={categories} placeholders={catPlaceholder} subcats={subcatsPlaceholder} />
            <div className="grid grid-cols-3 gap-5 mt-4">
              {Array.isArray(categories) ? (categories.length >= 6 ? categories.slice(0, 6) : categories).map((c) => (
                <Link key={c.id} href={`/dishes?category=${c.id}`} className="group block">
                  <div
                    className="flex flex-col items-center justify-center gap-2 text-center"
                    style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)", borderRadius: "22px", height: "var(--cat-btn-h)" }}
                  >
                    <span className="text-2xl mb-1">{getIcon(c.name)}</span>
                    <div className="font-medium" style={{ color: "#4b2f23" }}>
                      {c.name}
                    </div>
                  </div>
                </Link>
              )) : null}
              {(!categories || categories.length < 6) && Array.isArray(catPlaceholder) ?
                catPlaceholder.slice(0, Math.max(0, 6 - (categories?.length || 0))).map((name, i) => (
                  <div key={`cph-${i}`} className="group block">
                    <div
                      className="flex flex-col items-center justify-center gap-2 text-center"
                      style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)", borderRadius: "22px", height: "var(--cat-btn-h)" }}
                    >
                      <span className="text-2xl mb-1">{getIcon(name)}</span>
                      <div className="font-medium" style={{ color: "#4b2f23" }}>
                        {name}
                      </div>
                    </div>
                  </div>
                )) : null}
            </div>
          </div>

          <div className="space-y-4 md:col-span-6">
            <div className="flex items-baseline justify-between h-10 md:h-12">
              <h2 className="text-xl md:text-2xl font-semibold">Рекомендованные блюда</h2>
              <Link href="/dishes?section=recommended" className="btn-warm">
                Все блюда
              </Link>
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-6 gap-5" style={{ transform: "translateX(-4px)" }}>
              {recommended.slice(0, 2).map((d, index) => (
                <li key={d.id} className="md:col-span-3">
                  <DishCard dish={d} onOpen={openDish} forceBuyButton={index === 0} />
                </li>
              ))}
              {recommended.length < 2 &&
                recPlaceholderTop.slice(0, 2 - recommended.length).map((p, i) => (
                  <li key={`ph-top-${i}`} className="md:col-span-3">
                    <DishCardPlaceholder name={p.name} price={p.price} />
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6" style={{ ["--dish-card-h"]: "320px" } as CSSProperties}>
          {recommended.slice(2).map((d) => (
            <li key={d.id}>
              <DishCard dish={d} onOpen={openDish} />
            </li>
          ))}
          {Array.from({ length: Math.max(0, 4 - recommended.slice(2).length) }).map((_, i) => {
            const p = recPlaceholderMore[i];
            return (
              <li key={`ph-row2-${i}`}>
                <DishCardPlaceholder name={p.name} price={p.price} />
              </li>
            );
          })}
        </ul>

        <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 bg-white rounded-2xl shadow-lg p-6 mb-4 pt-6">
          <div className="flex items-baseline justify-between h-10 md:h-12">
            <h2 className="text-xl md:text-2xl font-semibold">Скоро</h2>
            <Link href="/dishes?section=soon" className="btn-warm">
              Все блюда
            </Link>
          </div>

          <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-6" style={{ ["--dish-card-h"]: "320px" } as CSSProperties}>
            {(soon.length > 0 ? soon.slice(0, 8) : []).map((d) => (
              <li key={d.id}>
                <DishCard dish={d} onOpen={openDish} />
              </li>
            ))}

            {soon.length === 0 &&
              promosPlaceholder.slice(0, 4).map((p, i) => (
                <li key={`soon-ph-${i}`}>
                  <DishCardPlaceholder name={p.name} price={p.price} badge="Скоро" />
                </li>
              ))}
          </ul>
        </section>

        <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 bg-white rounded-2xl shadow-lg p-6 mb-4 pt-6">
          <div className="flex items-baseline justify-between h-10 md:h-12">
            <h2 className="text-xl md:text-2xl font-semibold">Скидки и акции</h2>
            <Link href="/dishes?section=discounts" className="btn-warm">
              Все предложения
            </Link>
          </div>

          <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-6" style={{ ["--dish-card-h"]: "320px" } as CSSProperties}>
            {(discounted.length > 0 ? discounted : []).map((d) => (
              <li key={d.id}>
                <DishCard dish={d} onOpen={openDish} />
              </li>
            ))}

            {discounted.length === 0 &&
              promosPlaceholder.map((p, i) => (
                <li key={`promo-ph-${i}`}>
                  <DishCardPlaceholder name={p.name} price={p.price} badge={p.badge} />
                </li>
              ))}
          </ul>
        </section>
      </section>
    </>
  );
}
