"use client";

import { cartRemove, cartClear, cartAdd, type UUID } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

function getToken(token?: string) {
  return token || readCookie("accessToken");
}

type CartSelectionEventDetail = { deselected: string[]; storageKey: string };
const CART_SELECTION_EVENT = "cart_selection_updated";
const CART_DESELECTED_STORAGE_KEY = "cart_deselected_dishes";

function buildCartItemKey(dish: string, toppings: any[] = []) {
  const base = dish;
  if (!toppings || toppings.length === 0) return base;
  const normalized = [...toppings]
    .map((t) => ({ name: String(t.name ?? ""), price: Number(t.price ?? 0) }))
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      if (byName !== 0) return byName;
      return a.price - b.price;
    });
  const toppingPart = normalized.map((t) => `${t.name}:${t.price}`).join("|");
  return `${base}__${toppingPart}`;
}

function readDeselectedFromStorage(storageKey: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeDeselectedToStorage(storageKey: string, deselected: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(deselected));
  } catch {}
  window.dispatchEvent(
    new CustomEvent<CartSelectionEventDetail>(CART_SELECTION_EVENT, {
      detail: { deselected, storageKey },
    })
  );
}

function pruneDeselectedToCart(storageKey: string, cartItemKeys: string[]) {
  const keep = new Set(cartItemKeys);
  const current = readDeselectedFromStorage(storageKey);
  const next = current.filter((id) => keep.has(id));
  if (next.length === current.length) return;
  if (!next.length) {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    window.dispatchEvent(
      new CustomEvent<CartSelectionEventDetail>(CART_SELECTION_EVENT, {
        detail: { deselected: [], storageKey },
      })
    );
    return;
  }
  writeDeselectedToStorage(storageKey, next);
}

export function CartItemSelectToggle({
  dish,
  selectedToppings = [],
  storageKey = CART_DESELECTED_STORAGE_KEY,
  defaultSelected = true,
  disabled,
}: {
  dish: UUID;
  selectedToppings?: any[];
  storageKey?: string;
  defaultSelected?: boolean;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState(defaultSelected);
  const itemKey = buildCartItemKey(String(dish), selectedToppings);

  useEffect(() => {
    const deselected = readDeselectedFromStorage(storageKey);
    setSelected(!deselected.includes(itemKey));
  }, [itemKey, storageKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CartSelectionEventDetail | undefined>).detail;
      if (!detail) return;
      if (detail.storageKey !== storageKey) return;
      setSelected(!detail.deselected.includes(itemKey));
    };
    window.addEventListener(CART_SELECTION_EVENT, handler);
    return () => window.removeEventListener(CART_SELECTION_EVENT, handler);
  }, [itemKey, storageKey]);

  return (
    <div className="flex items-center justify-center shrink-0">
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={(e) => {
          const nextSelected = e.target.checked;
          setSelected(nextSelected);
          const deselected = readDeselectedFromStorage(storageKey);
          const next = nextSelected ? deselected.filter((x) => x !== itemKey) : Array.from(new Set([...deselected, itemKey]));
          writeDeselectedToStorage(storageKey, next);
        }}
        className="h-5 w-5 accent-[#c9825b] cursor-pointer disabled:opacity-50"
        aria-label={selected ? "Позиция будет заказана" : "Позиция не будет заказана"}
      />
    </div>
  );
}

export function CartTotals({
  items,
  storageKey = CART_DESELECTED_STORAGE_KEY,
}: {
  items: Array<{ dish: UUID; quantity: number; price: number; selected_toppings?: any[] }>;
  storageKey?: string;
}) {
  const [deselectedDishIds, setDeselectedDishIds] = useState<string[]>([]);

  useEffect(() => {
    setDeselectedDishIds(readDeselectedFromStorage(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CartSelectionEventDetail | undefined>).detail;
      if (!detail) return;
      if (detail.storageKey !== storageKey) return;
      setDeselectedDishIds(detail.deselected);
    };
    window.addEventListener(CART_SELECTION_EVENT, handler);
    return () => window.removeEventListener(CART_SELECTION_EVENT, handler);
  }, [storageKey]);

  const selectedItems = items.filter(
    (it) => !deselectedDishIds.includes(buildCartItemKey(String(it.dish), it.selected_toppings))
  );
  const selectedTotal = selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const selectedPositions = selectedItems.length;
  const selectedCount = selectedItems.reduce((s, x) => s + x.quantity, 0);

  return (
    <div className="bg-card rounded-[32px] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black text-gray-400 uppercase tracking-widest">Итого</div>
        <div className="text-2xl font-black text-gray-900">{new Intl.NumberFormat("ru-RU").format(Math.round(selectedTotal))} ₽</div>
      </div>
      <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
        <span>Позиции</span>
        <span className="font-bold text-gray-900">{selectedPositions}</span>
      </div>
      <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
        <span>Товаров</span>
        <span className="font-bold text-gray-900">{selectedCount}</span>
      </div>
    </div>
  );
}

export function RemoveItemButton({ dish, token }: { dish: UUID; token?: string }) {
  const router = useRouter();
  async function onClick() {
    try {
      await cartRemove(dish, getToken(token));
      window.dispatchEvent(new Event("cart_changed"));
      router.refresh();
    } catch {}
  }
  return (
    <button onClick={onClick} className="border rounded-full px-3 py-1 text-sm">Удалить</button>
  );
}

export function ClearCartButton({ token }: { token?: string }) {
  const router = useRouter();
  async function onClick() {
    try {
      await cartClear(getToken(token));
      try {
        localStorage.removeItem(CART_DESELECTED_STORAGE_KEY);
      } catch {}
      window.dispatchEvent(
        new CustomEvent<CartSelectionEventDetail>(CART_SELECTION_EVENT, {
          detail: { deselected: [], storageKey: CART_DESELECTED_STORAGE_KEY },
        })
      );
      window.dispatchEvent(new Event("cart_changed"));
      router.refresh();
    } catch {}
  }
  return (
    <button onClick={onClick} className="border rounded-full px-3 py-1 text-sm">Очистить корзину</button>
  );
}

export function CartItemControls({
  dish,
  quantity,
  minQuantity = 1,
  maxQuantity,
  token,
  items,
  selectedToppings = [],
}: {
  dish: UUID;
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  token?: string;
  selectedToppings?: any[];
  items: Array<{ dish: UUID; quantity: number; selected_toppings?: any[] }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const effectiveToken = getToken(token);
  const effectiveMax = maxQuantity && maxQuantity > 0 ? Math.max(maxQuantity, minQuantity) : null;

  const rebuild = async (nextItems: Array<{ dish: UUID; quantity: number; selected_toppings?: any[] }>) => {
    await cartClear(effectiveToken);
    for (const it of nextItems) {
      if (it.quantity > 0) {
        await cartAdd(it.dish, it.quantity, effectiveToken, it.selected_toppings);
      }
    }
    pruneDeselectedToCart(
      CART_DESELECTED_STORAGE_KEY,
      nextItems.map((x) => buildCartItemKey(String(x.dish), x.selected_toppings))
    );
    window.dispatchEvent(new Event("cart_changed"));
  };

  const areToppingsEqual = (a: any[] = [], b: any[] = []) => {
    if (a.length !== b.length) return false;
    // Simple check: names and prices match
    const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
    const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
    return sortedA.every((val, index) => val.name === sortedB[index].name && val.price === sortedB[index].price);
  };

  const setQty = async (nextQuantity: number) => {
    const withMin = Math.max(minQuantity, nextQuantity);
    const clamped = effectiveMax ? Math.min(effectiveMax, withMin) : withMin;
    const nextItems = items.map((it) => 
      (it.dish === dish && areToppingsEqual(it.selected_toppings, selectedToppings)) 
        ? { ...it, quantity: clamped } 
        : it
    );
    setLoading(true);
    try {
      await rebuild(nextItems);
      router.refresh();
    } catch {} finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    const nextItems = items.filter((it) => 
      !(it.dish === dish && areToppingsEqual(it.selected_toppings, selectedToppings))
    );
    setLoading(true);
    try {
      await rebuild(nextItems);
      router.refresh();
    } catch {} finally {
      setLoading(false);
    }
  };

  const canDec = quantity > minQuantity && !loading;
  const canInc = !loading && (!effectiveMax || quantity < effectiveMax);
  const limitParts: string[] = [];
  if (minQuantity > 1) limitParts.push(`Мин. ${minQuantity} шт.`);
  if (effectiveMax) limitParts.push(`Макс. ${effectiveMax} шт.`);
  const limits = limitParts.length ? (
    <div
      className="inline-flex items-center px-3 py-1 rounded-full border border-[#f0e2d6] bg-[#fff9f3] text-[11px] font-black whitespace-nowrap leading-none"
      style={{ color: "#7c6b62" }}
    >
      {limitParts.join(" • ")}
    </div>
  ) : null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        {limits}
        <div className="inline-flex items-center rounded-full border border-[#f0e2d6] bg-white shadow-sm p-1 gap-1">
          <button
            type="button"
            onClick={() => void setQty(quantity - 1)}
            disabled={!canDec}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[22px] font-black text-[#4b2f23] hover:bg-[#fff9f3] active:bg-[#fff4ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9825b]/30"
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span className="px-3 min-w-[3.25rem] text-center text-lg font-black tabular-nums text-[#4b2f23] flex items-center justify-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => void setQty(quantity + 1)}
            disabled={!canInc}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[22px] font-black text-[#4b2f23] hover:bg-[#fff9f3] active:bg-[#fff4ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9825b]/30"
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void remove()}
        disabled={loading}
        className="px-4 py-2 rounded-2xl border border-gray-100 bg-white font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
      >
        Удалить
      </button>
    </div>
  );
}

export function AddToCartButton({ 
  dish, 
  quantity, 
  minQuantity = 1,
  maxQuantityPerOrder,
  token, 
  variant = "text", 
  labelPrice,
  selectedToppings = [],
}: { 
  dish: UUID; 
  quantity?: number; 
  minQuantity?: number;
  maxQuantityPerOrder?: number | null;
  token?: string; 
  variant?: "text" | "icon" | "compact"; 
  labelPrice?: string;
  selectedToppings?: any[];
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState(quantity || minQuantity);
  const [isDisabled, setIsDisabled] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | "max" | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const disabledTimerRef = useRef<number | null>(null);
  const effectiveToken = getToken(token);
  const effectiveMax = maxQuantityPerOrder && maxQuantityPerOrder > 0 ? Math.max(maxQuantityPerOrder, minQuantity) : null;

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
      if (disabledTimerRef.current !== null) window.clearTimeout(disabledTimerRef.current);
    };
  }, []);

  const flash = (kind: "success" | "error" | "max") => {
    setFeedback(kind);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 1400);
  };

  useEffect(() => {
    setCurrentQuantity((prev) => {
      const withMin = Math.max(minQuantity, prev);
      return effectiveMax ? Math.min(effectiveMax, withMin) : withMin;
    });
  }, [effectiveMax, minQuantity]);

  async function onClick() {
    if (isDisabled) return;
    if (effectiveMax && currentQuantity > effectiveMax) {
      flash("max");
      return;
    }
    setIsDisabled(true);
    try {
      await cartAdd(dish, currentQuantity, effectiveToken, selectedToppings);
      window.dispatchEvent(new Event("cart_changed"));
      router.refresh();
      flash("success");
    } catch {
      flash("error");
    }
    finally {
      if (disabledTimerRef.current !== null) window.clearTimeout(disabledTimerRef.current);
      disabledTimerRef.current = window.setTimeout(() => setIsDisabled(false), 1500);
    }
  }

  const increment = () =>
    setCurrentQuantity((prev) => {
      const next = prev + 1;
      return effectiveMax ? Math.min(effectiveMax, next) : next;
    });
  const decrement = () => setCurrentQuantity(prev => Math.max(minQuantity, prev - 1));
  const canInc = !effectiveMax || currentQuantity < effectiveMax;
  const limitParts: string[] = [];
  if (minQuantity > 1) limitParts.push(`Мин. ${minQuantity} шт.`);
  if (effectiveMax) limitParts.push(`Макс. ${effectiveMax} шт.`);
  const limits = limitParts.length ? (
    <div
      className="inline-flex items-center px-3 py-1 rounded-full border border-[#f0e2d6] bg-[#fff9f3] text-[11px] font-black leading-none"
      style={{ color: "#7c6b62" }}
    >
      {limitParts.join(" • ")}
    </div>
  ) : null;
  const compactText =
    feedback === "success"
      ? "Добавлено"
      : feedback === "error"
        ? "Ошибка"
        : feedback === "max" && effectiveMax
          ? `Макс. ${effectiveMax}`
          : "Купить";
  const buttonText =
    feedback === "success"
      ? "Добавлено"
      : feedback === "error"
        ? "Ошибка"
        : feedback === "max" && effectiveMax
          ? `Макс. ${effectiveMax} шт.`
          : null;

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className="btn-warm btn-toggle disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Добавить в корзину"
        disabled={isDisabled}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={hover && !isDisabled ? { backgroundColor: "#C9825B", color: "#FFFFFF", borderColor: "#C9825B", opacity: 1 } : undefined}
      >
        {labelPrice ? (
          <>
            <span className="btn-price">{labelPrice} ₽</span>
            <span className="btn-buy">{compactText}</span>
          </>
        ) : (
          <span className="btn-buy">{compactText}</span>
        )}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-2">
        {currentQuantity > minQuantity && (
          <button onClick={decrement} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">-</button>
        )}
        <button
          onClick={onClick}
          className="btn-warm disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ width: 36, height: 36, padding: 0 }}
          aria-label="Добавить в корзину"
          disabled={isDisabled}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </button>
        <button onClick={increment} disabled={!canInc} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {limits}
        <div className="inline-flex items-center rounded-full border border-[#f0e2d6] bg-white shadow-sm p-1 gap-1">
          <button
            onClick={decrement}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[22px] font-black text-[#4b2f23] hover:bg-[#fff9f3] active:bg-[#fff4ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9825b]/30"
            disabled={currentQuantity <= minQuantity}
            aria-label="Уменьшить количество"
            type="button"
          >
            −
          </button>
          <span className="px-3 min-w-[3.25rem] text-center text-lg font-black tabular-nums text-[#4b2f23] flex items-center justify-center">
            {currentQuantity}
          </span>
          <button
            onClick={increment}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[22px] font-black text-[#4b2f23] hover:bg-[#fff9f3] active:bg-[#fff4ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9825b]/30"
            disabled={!canInc}
            aria-label="Увеличить количество"
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={onClick}
        className="btn-warm btn-toggle w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-[#c9825b]/20 disabled:opacity-60 disabled:cursor-not-allowed"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={hover && !isDisabled ? { backgroundColor: "#C9825B", color: "#FFFFFF", borderColor: "#C9825B", opacity: 1 } : undefined}
        disabled={isDisabled}
      >
        {labelPrice ? (
          <>
            <span className="btn-price">{(parseFloat(labelPrice) * currentQuantity).toFixed(0)} ₽</span>
            <span className="btn-buy">{buttonText ?? `Добавить ${currentQuantity} шт.`}</span>
          </>
        ) : (
          <span className="btn-buy">{buttonText ?? `Добавить ${currentQuantity} шт. в корзину`}</span>
        )}
      </button>
    </div>
  );
}
