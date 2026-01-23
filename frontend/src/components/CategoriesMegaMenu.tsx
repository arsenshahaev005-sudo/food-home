"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Category } from "@/lib/api";

export default function CategoriesMegaMenu({ categories, placeholders, subcats }: { categories: Category[]; placeholders: string[]; subcats?: Record<string, string[]> }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [subSel, setSubSel] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const catListRef = useRef<HTMLUListElement | null>(null);
  const subListRef = useRef<HTMLUListElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Проверка, что categories является массивом
  const safeCategories: Category[] = Array.isArray(categories) ? categories : [];

  const all: Category[] = [
    ...safeCategories,
    ...placeholders
      .filter(p => !safeCategories.some(c => c.name === p))
      .map((p, idx) => ({ id: `ph-${idx}`, name: p }))
  ];

  useEffect(() => {
    if (!open || all.length === 0) return;
    function onDown(e: MouseEvent) {
      const el = panelRef.current;
      const btn = btnRef.current;
      if (el && !el.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onWheel(e: WheelEvent) {
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      const el = panelRef.current;
      if (!el) return;
      const isInside = el.contains(document.activeElement as Node);
      if (!isInside) return;
      const max = all.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (sel + 1) % max;
        setSel(next);
        const btns = catListRef.current?.querySelectorAll("button");
        (btns?.[next] as HTMLButtonElement | undefined)?.focus?.();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (sel - 1 + max) % max;
        setSel(prev);
        const btns = catListRef.current?.querySelectorAll("button");
        (btns?.[prev] as HTMLButtonElement | undefined)?.focus?.();
      } else if (e.key === "Home") {
        e.preventDefault();
        setSel(0);
        const btns = catListRef.current?.querySelectorAll("button");
        (btns?.[0] as HTMLButtonElement | undefined)?.focus?.();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = max - 1;
        setSel(last);
        const btns = catListRef.current?.querySelectorAll("button");
        (btns?.[last] as HTMLButtonElement | undefined)?.focus?.();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        // переключиться на список подкатегорий
        const items = subListRef.current?.querySelectorAll("a");
        if (items && items.length) {
          e.preventDefault();
          setSubSel(0);
          (items[0] as HTMLAnchorElement | undefined)?.focus?.();
        }
      }
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const firstBtn = catListRef.current?.querySelector("button");
      (firstBtn as HTMLButtonElement | null)?.focus?.();
    }, 0);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, sel, all.length]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mega_sel");
      if (stored) setSel(Math.max(0, Math.min(all.length - 1, parseInt(stored, 10) || 0)));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem("mega_sel", String(sel)); } catch {}
  }, [sel]);

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("выпечка") || n.includes("хлеб") || n.includes("булочк")) return "🥐";
    if (n.includes("плов") || n.includes("паста") || n.includes("лапша")) return "🍝";
    if (n.includes("суп") || n.includes("бульон")) return "🍲";
    if (n.includes("мяс") || n.includes("птица") || n.includes("котлет")) return "🍖";
    if (n.includes("рыб")) return "🐟";
    if (n.includes("завтрак") || n.includes("каша") || n.includes("яичница")) return "🍳";
    if (n.includes("салат") || n.includes("закуск")) return "🥗";
    if (n.includes("напит") || n.includes("сок") || n.includes("чай") || n.includes("кофе")) return "🥤";
    if (n.includes("замороз") || n.includes("пельмен") || n.includes("вареник")) return "❄️";
    if (n.includes("консерв") || n.includes("варенье") || n.includes("соленья")) return "🍯";
    if (n.includes("подар") || n.includes("набор")) return "🎁";
    if (n.includes("уют") || n.includes("дом") || n.includes("декор") || n.includes("плед") || n.includes("ночник")) return "🏠";
    if (n.includes("красот") || n.includes("уход") || n.includes("мыло") || n.includes("косметик")) return "✨";
    if (n.includes("одежд") || n.includes("аксессуар") || n.includes("сумк") || n.includes("шапк")) return "🧣";
    if (n.includes("хобби") || n.includes("творчеств") || n.includes("картин") || n.includes("открытк")) return "🎨";
    if (n.includes("животн") || n.includes("питомц") || n.includes("собак") || n.includes("кошек")) return "🐾";
    if (n.includes("детск")) return "👶";
    if (n.includes("веган") || n.includes("пп") || n.includes("полезн")) return "🌱";
    if (n.includes("десерт") || n.includes("торт") || n.includes("сладост")) return "🍰";
    return "🍴";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative">
      <div className="flex items-baseline justify-between h-10 md:h-12">
        <h2 className="text-xl md:text-2xl font-semibold">Категории</h2>
        <button ref={btnRef} type="button" className="btn-warm" onClick={() => setOpen((v) => !v)}>
          Показать все
        </button>
      </div>


      <div
        ref={panelRef}
        className="fixed left-0 z-40"
        style={{
          width: "min(100vw, 640px)",
          top: "5rem",
          height: "calc(100vh - 5rem)",
          transform: open ? "translateX(0)" : "translateX(-104%)",
          opacity: open ? 1 : 0,
          transition: "transform 240ms ease, opacity 240ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="h-full flex" style={{ boxShadow: "var(--shadow-soft)" }}>
            <aside className="w-64 p-4 flex flex-col" style={{ backgroundColor: "#fcf8f3", borderRight: "1px solid var(--border-warm)" }}>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="text-lg font-black uppercase tracking-wider" style={{ color: "#4b2f23" }}>Категории</div>
                <button className="p-2 hover:bg-black/5 rounded-full transition-colors" onClick={() => setOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b2f23" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ul ref={catListRef} className="space-y-1 overflow-y-auto flex-1 pr-2 custom-scrollbar" role="menu" aria-label="Список категорий">
                {all.map((c: Category, i: number) => {
                  const name = c.name;
                  return (
                    <li key={c.id} className="w-full">
                      <button
                        className="btn-warm !w-full !flex !items-center !gap-3 !justify-start !px-3"
                        style={sel === i ? { backgroundColor: "#c9825b", color: "#ffffff", transition: "background-color 200ms ease, color 200ms ease" } : { transition: "background-color 200ms ease, color 200ms ease" }}
                        onClick={() => setSel(i)}
                        onMouseEnter={() => setSel(i)}
                        aria-pressed={sel === i}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="flex-shrink-0 inline-flex items-center justify-center rounded text-sm" style={{ width: 24, height: 24, backgroundColor: "#fcf8f3", border: "1px solid var(--border-warm)" }}>
                          {getIcon(name)}
                        </span>
                        <span className="truncate" style={{ color: sel === i ? "#ffffff" : "#4b2f23", textAlign: "left" }}>{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
            <section className="flex-1 p-4 flex flex-col" style={{ backgroundColor: "#fcf8f3" }}>
              <div
                className="text-lg font-black uppercase tracking-wider mb-4 flex-shrink-0" style={{ color: "#4b2f23" }}>Подкатегории</div>
              <ul ref={subListRef} key={sel} className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-2 custom-scrollbar content-start" style={{ animation: "warmFadeIn 200ms ease both" }}>
                {(() => {
                  const current = all[sel];
                  if (!current) return null;
                  const key = current.id;
                  const name = current.name;
                  const generic = ["Популярные", "Новинки", "Классические", "Домашние", "Сезонные", "Быстрые", "Диетические", "Семейные"];
                  
                  // Сначала используем подкатегории из БД, если они есть
                  let items: (string | Category)[] = generic;
                  if (current.subcategories && current.subcategories.length > 0) {
                    items = current.subcategories;
                  } else if (subcats) {
                    // Fallback на статику для плейсхолдеров
                    if (key && subcats[key]) {
                      items = subcats[key];
                    } else if (name && subcats[name]) {
                      items = subcats[name];
                    }
                  }
                  
                  const catId = current.id.startsWith("ph-") ? "" : current.id;
                  return items.map((s, idx) => {
                    const isObj = typeof s !== "string";
                    const label = isObj ? s.name : s;
                    const subId = isObj ? s.id : "";
                    const href = subId ? `/dishes?category=${subId}` : (catId ? `/dishes?category=${catId}` : "/dishes");

                    return (
                      <li key={`sub-${idx}`} className="h-fit">
                        <Link
                          href={href}
                          className="btn-warm w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9825b] !h-10 !px-4"
                          style={subSel === idx ? { backgroundColor: "#c9825b", color: "#ffffff", justifyContent: "flex-start", textAlign: "left", transition: "background-color 200ms ease, color 200ms ease" } : { justifyContent: "flex-start", textAlign: "left", transition: "background-color 200ms ease, color 200ms ease" }}
                          onMouseEnter={() => setSubSel(idx)}
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  });
                })()}
              </ul>
            </section>
          </div>
        </div>
    </div>
  );
}
