"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDishes, getCategories, getProducers, type Dish, type Category, type Producer } from "@/lib/api";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [dishResults, setDishResults] = useState<Dish[]>([]);
  const [catResults, setCatResults] = useState<Category[]>([]);
  const [prodResults, setProdResults] = useState<Producer[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q || q.length < 2) { return; }
    timer.current = window.setTimeout(async () => {
      try {
        const [dishes, cats, prods] = await Promise.all([
          getDishes({ search: q, is_available: "true" }),
          getCategories(),
          getProducers(),
        ]);
        setDishResults(dishes.slice(0, 5));
        setCatResults(cats.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4));
        setProdResults(prods.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4));
        setOpen(true);
        setActive(0);
      } catch {
      }
    }, 200);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = boxRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qs = q ? `?search=${encodeURIComponent(q)}` : "";
    router.push(`/dishes${qs}`);
    setOpen(false);
  }

  const items = [
    ...dishResults.map((d) => ({ href: `/dishes/${d.id}`, label: d.name })),
    ...catResults.map((c) => ({ href: `/dishes?category=${c.id}`, label: c.name })),
    ...prodResults.map((p) => ({ href: `/producers/${p.id}`, label: p.name })),
  ];
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const show = open && items.length > 0 && q.length >= 2;
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((idx) => (idx + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((idx) => (idx - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) { router.push(it.href); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function renderLabel(label: string) {
    const i = label.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return label;
    const pre = label.slice(0, i);
    const hit = label.slice(i, i + q.length);
    const post = label.slice(i + q.length);
    return (
      <span>
        {pre}
        <span className="font-semibold">{hit}</span>
        {post}
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} className="flex-1">
        <div className="flex items-center gap-3 rounded-full px-5" style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", height: 40 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c6b62" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            ref={inputRef}
            placeholder="Поиск блюд..."
            className="w-full bg-transparent text-sm placeholder-[var(--text-secondary)] focus:outline-none"
          />
        </div>
      </form>

      {(open && (items.length > 0) && q.length >= 2) && (
        <div
          className="absolute left-0 right-0 mt-2 p-3 space-y-2"
          style={{
            backgroundColor: "#fcf8f3",
            borderRadius: 16,
            boxShadow: "var(--shadow-soft)",
            border: "1px solid var(--border-warm)",
            transform: "translateY(0)",
            opacity: 1,
            transition: "transform 160ms ease, opacity 160ms ease",
          }}
          role="listbox"
        >
          {dishResults.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: "#7c6b62" }}>Блюда</div>
              <ul className="space-y-1">
                {dishResults.map((d, idx) => {
                  const flatIdx = idx;
                  const activeItem = active === flatIdx;
                  return (
                    <li key={d.id}>
                      <Link href={`/dishes/${d.id}`} className="block rounded px-2 py-1" style={activeItem ? { backgroundColor: "#c9825b", color: "#ffffff" } : { color: "#4b2f23" }}>{renderLabel(d.name)}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {catResults.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: "#7c6b62" }}>Категории</div>
              <ul className="space-y-1">
                {catResults.map((c, idx) => {
                  const flatIdx = dishResults.length + idx;
                  const activeItem = active === flatIdx;
                  return (
                    <li key={c.id}>
                      <Link href={`/dishes?category=${c.id}`} className="block rounded px-2 py-1" style={activeItem ? { backgroundColor: "#c9825b", color: "#ffffff" } : { color: "#4b2f23" }}>{renderLabel(c.name)}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {prodResults.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: "#7c6b62" }}>Производители</div>
              <ul className="space-y-1">
                {prodResults.map((p, idx) => {
                  const flatIdx = dishResults.length + catResults.length + idx;
                  const activeItem = active === flatIdx;
                  return (
                    <li key={p.id}>
                      <Link href={`/producers/${p.id}`} className="block rounded px-2 py-1" style={activeItem ? { backgroundColor: "#c9825b", color: "#ffffff" } : { color: "#4b2f23" }}>{renderLabel(p.name)}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(dishResults.length === 0 && catResults.length === 0 && prodResults.length === 0) && (
            <div className="text-sm" style={{ color: "#7c6b62" }}>Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
