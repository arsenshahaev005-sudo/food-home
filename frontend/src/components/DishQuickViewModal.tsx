"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/CartActions";
import AddressCapsule from "@/components/AddressCapsule";
import { BASE_URL, type Dish, type UUID, type Producer, estimateOrder } from "@/lib/api";

type Coords = { lat: number; lon: number };

const DELIVERY_ADDRESS_EVENT = "delivery_address_updated";
const DELIVERY_ADDRESS_TEXT_KEY = "delivery_address_text";
const DELIVERY_COORDS_KEY = "delivery_coords";

function formatNumber(value?: number | string | null) {
  if (value === null || value === undefined) return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("ru-RU").format(n);
}

function extractDetailMessage(e: unknown) {
  if (!e) return "Не удалось загрузить данные.";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.detail === "string") return anyErr.detail;
    if (typeof anyErr.message === "string") return anyErr.message;
  }
  return "Не удалось загрузить данные.";
}

function normalizeImageSrc(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE_URL}${src}`;
  return `${BASE_URL}/${src}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
}

function formatMacro(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

async function fetchDish(id: UUID, signal?: AbortSignal): Promise<Dish> {
  const res = await fetch(`${BASE_URL}/api/dishes/${id}/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    throw data || { detail: `API Error ${res.status}` };
  }
  return res.json();
}

async function fetchProducer(id: UUID, signal?: AbortSignal): Promise<Producer> {
  const res = await fetch(`${BASE_URL}/api/producers/${id}/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    throw data || { detail: `API Error ${res.status}` };
  }
  return res.json();
}

function getFocusable(container: HTMLElement | null) {
  if (!container) return [];
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
  );
}

export default function DishQuickViewModal({
  isOpen,
  dishId,
  initialDish,
  onClose,
}: {
  isOpen: boolean;
  dishId: UUID | null;
  initialDish?: Dish | null;
  onClose: () => void;
}) {
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const [dish, setDish] = useState<Dish | null>(initialDish ?? null);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<any[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(normalizeImageSrc(initialDish?.photo) || null);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<"BUILDING" | "DOOR">("BUILDING");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryCoords, setDeliveryCoords] = useState<Coords | null>(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState<{
    delivery_price: number;
    total_price: number;
    discount_amount?: number;
    estimated_cooking_time?: number;
  } | null>(null);
  const [deliveryEstimateLoading, setDeliveryEstimateLoading] = useState(false);
  const [deliveryEstimateError, setDeliveryEstimateError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      setSelectedToppings([]);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
      setDish(null);
      setSelectedToppings([]);
      setActiveImage(null);
      setBrokenImages({});
      setLoading(false);
      setError(null);
      setDeliveryEstimate(null);
      setDeliveryEstimateError(null);
      setDeliveryEstimateLoading(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen || !dishId) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!active || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("modal-open");
      lastActiveRef.current?.focus?.();
    };
  }, [isOpen, dishId, onClose]);

  useEffect(() => {
    if (!isOpen || !dishId) return;
    if (initialDish?.id === dishId) {
      setDish(initialDish);
      const nextActive = normalizeImageSrc(initialDish.photo) || normalizeImageSrc(initialDish.images?.[0]?.image) || null;
      setActiveImage(nextActive);
    } else {
      setDish(null);
      setActiveImage(null);
    }
  }, [dishId, initialDish, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!dish?.producer) {
      setProducer(null);
      return;
    }
    const controller = new AbortController();
    setProducer(null);
    fetchProducer(dish.producer, controller.signal)
      .then((p) => setProducer(p))
      .catch(() => {});
    return () => controller.abort();
  }, [dish?.producer, isOpen]);

  const extraImages = useMemo(() => {
    const list = (dish?.images || []).map((img) => ({ key: String(img.id), src: normalizeImageSrc(img.image) }));
    const seen = new Set<string>();
    return list.filter((x) => {
      if (!x.src) return false;
      if (seen.has(x.src)) return false;
      seen.add(x.src);
      return true;
    });
  }, [dish]);

  const mainSrc = useMemo(() => normalizeImageSrc(dish?.photo), [dish?.photo]);

  const thumbImages = useMemo(() => {
    const list: { key: string; src: string }[] = [];
    if (mainSrc) list.push({ key: "main", src: mainSrc });
    list.push(...extraImages);
    const seen = new Set<string>();
    return list.filter((x) => {
      if (!x.src) return false;
      if (seen.has(x.src)) return false;
      seen.add(x.src);
      return true;
    });
  }, [extraImages, mainSrc]);

  const toppings = useMemo(() => {
    if (!dish) return [] as any[];
    if (dish.toppings && dish.toppings.length > 0) {
      return dish.toppings as any[];
    }
    if (!dish.fillings) return [] as any[];
    return dish.fillings
      .split(",")
      .map((raw, index) => {
        const name = raw.trim();
        if (!name) return null;
        return { id: `filling-${index}`, name, price: 0 };
      })
      .filter((x): x is any => Boolean(x));
  }, [dish]);

  const discountedPrice = useMemo(() => {
    if (!dish) return null;
    const price = Number(dish.price);
    if (!Number.isFinite(price)) return null;
    const basePrice =
      dish.discount_percentage > 0 ? Math.round(price * (1 - dish.discount_percentage / 100)) : Math.round(price);

    const toppingsPrice = selectedToppings.reduce((acc, t) => acc + Number(t.price || 0), 0);
    return basePrice + toppingsPrice;
  }, [dish, selectedToppings]);

  const toggleTopping = (topping: any) => {
    setSelectedToppings(prev => {
      const exists = prev.find(t => t.id === topping.id);
      if (exists) {
        return [];
      }
      return [topping];
    });
  };

  const kbju = useMemo(() => {
    const calories = typeof dish?.calories === "number" ? dish.calories : Number(dish?.calories);
    const proteins = Number.parseFloat(String(dish?.proteins ?? ""));
    const fats = Number.parseFloat(String(dish?.fats ?? ""));
    const carbs = Number.parseFloat(String(dish?.carbs ?? ""));

    const c = Number.isFinite(calories) ? calories : 0;
    const p = Number.isFinite(proteins) ? proteins : 0;
    const f = Number.isFinite(fats) ? fats : 0;
    const cr = Number.isFinite(carbs) ? carbs : 0;

    const hasAny = c > 0 || p > 0 || f > 0 || cr > 0;
    if (!hasAny) return null;
    return { calories: c, proteins: p, fats: f, carbs: cr };
  }, [dish?.calories, dish?.proteins, dish?.fats, dish?.carbs]);

  useEffect(() => {
    if (!activeImage) return;
    if (!brokenImages[activeImage]) return;
    const mainSrc = normalizeImageSrc(dish?.photo);
    if (mainSrc && !brokenImages[mainSrc]) {
      setActiveImage(mainSrc);
      return;
    }
    const next = extraImages.find((img) => img.src && !brokenImages[img.src])?.src || null;
    if (next && next !== activeImage) setActiveImage(next);
  }, [activeImage, brokenImages, dish?.photo, extraImages]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!dishId) return;
      setLoading(true);
      setError(null);
      try {
        const full = await fetchDish(dishId, signal);
        setDish(full);
        setActiveImage((prev) => prev || normalizeImageSrc(full.photo) || normalizeImageSrc(full.images?.[0]?.image) || null);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setError(extractDetailMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [dishId]
  );

  useEffect(() => {
    if (!isOpen || !dishId) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [dishId, isOpen, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const a = localStorage.getItem(DELIVERY_ADDRESS_TEXT_KEY) || "";
      const c = localStorage.getItem(DELIVERY_COORDS_KEY);
      let parsed: Coords | null = null;
      if (c) parsed = JSON.parse(c);
      if (a) setDeliveryAddress(a);
      if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
        setDeliveryCoords(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ address: string; coords: Coords | null; storageTextKey: string; storageCoordsKey: string } | undefined>).detail;
      if (!detail) return;
      if (detail.storageTextKey !== DELIVERY_ADDRESS_TEXT_KEY || detail.storageCoordsKey !== DELIVERY_COORDS_KEY) return;
      if (typeof detail.address === "string") setDeliveryAddress(detail.address);
      const nextCoords = detail.coords;
      if (nextCoords && typeof nextCoords.lat === "number" && typeof nextCoords.lon === "number") {
        setDeliveryCoords({ lat: nextCoords.lat, lon: nextCoords.lon });
      }
      if (nextCoords === null) setDeliveryCoords(null);
    };
    window.addEventListener(DELIVERY_ADDRESS_EVENT, handler);
    return () => window.removeEventListener(DELIVERY_ADDRESS_EVENT, handler);
  }, []);

  const runEstimate = useCallback(
    async (coords: Coords | null, dishObj: Dish | null) => {
      if (!coords || !dishObj) return;
      const token = getCookie("accessToken") || undefined;
      setDeliveryEstimateLoading(true);
      setDeliveryEstimateError(null);
      try {
        const res = await estimateOrder(
          {
            dish: dishObj.id,
            quantity: 1,
            delivery_latitude: coords.lat,
            delivery_longitude: coords.lon,
            delivery_type: deliveryType,
          },
          token
        );
        setDeliveryEstimate(res);
      } catch (e) {
        setDeliveryEstimate(null);
        setDeliveryEstimateError(extractDetailMessage(e));
      } finally {
        setDeliveryEstimateLoading(false);
      }
    },
    [deliveryType]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!dish || !deliveryCoords) return;
    void runEstimate(deliveryCoords, dish);
  }, [isOpen, dish, deliveryCoords, runEstimate]);

  const handleAddressChange = useCallback(
    (value: string, coords: Coords | null) => {
      setDeliveryAddress(value);
      setDeliveryCoords(coords);
      if (coords && dish) {
        void runEstimate(coords, dish);
      } else {
        setDeliveryEstimate(null);
        setDeliveryEstimateError(null);
      }
    },
    [dish, runEstimate]
  );
  const totalWithDelivery = useMemo(() => {
    if (!deliveryEstimate) return null;
    if (discountedPrice === null) return null;
    return discountedPrice + deliveryEstimate.delivery_price;
  }, [discountedPrice, deliveryEstimate]);

  const titleId = dishId ? `dish-modal-title-${dishId}` : "dish-modal-title";
  const descId = dishId ? `dish-modal-desc-${dishId}` : "dish-modal-desc";

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop/Overlay */}
      <div 
        className={[
          "fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300",
          closing ? "opacity-0" : "opacity-100",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Centering container */}
      <div className="flex min-h-screen items-center justify-center px-2 py-0 md:px-4 md:py-1">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={[
            "bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative transition-all duration-300",
            closing ? "animate-[warmZoomOut_0.22s_ease-in_forwards]" : "animate-in zoom-in-95 duration-300",
          ].join(" ")}
          style={{ maxHeight: "min(920px, calc(100vh - 96px))" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="absolute top-6 right-6 z-10">
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-3 bg-white/90 hover:bg-white rounded-2xl transition-all text-gray-900 shadow-xl border border-gray-100 hover:scale-110 active:scale-95"
              aria-label="Закрыть"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar bg-white overscroll-contain">
            <div className="p-6 md:p-8 block md:block relative pb-2 md:pb-4 min-h-full bg-white">
              <div className="md:float-left md:w-1/2 space-y-4 md:mr-8 md:mb-6">
                <div className="aspect-square rounded-[32px] overflow-hidden shadow-lg border border-gray-100 bg-white relative">
                  {activeImage && !brokenImages[activeImage] ? (
                    <img
                      src={activeImage}
                      alt={dish?.name || "Фото блюда"}
                      className="w-full h-full object-cover"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [activeImage]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
                  )}

                  {dish?.discount_percentage ? (
                    <div className="absolute top-4 left-4 bg-[#C9825B] text-white font-black px-4 py-2 rounded-2xl shadow-xl text-lg">
                      −{dish.discount_percentage}%
                    </div>
                  ) : null}
                </div>

                {thumbImages.length > 1 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {thumbImages.slice(0, 9).map((img) => {
                      const isActive = activeImage === img.src;
                      return (
                        <button
                          key={img.key}
                          type="button"
                          onClick={() => setActiveImage(img.src)}
                          className={[
                            "aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white relative",
                            isActive ? "ring-2 ring-[#c9825b]/30" : "",
                          ].join(" ")}
                          aria-label="Показать фото"
                        >
                          {!brokenImages[img.src] ? (
                            <img
                              src={img.src}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={() => setBrokenImages((prev) => ({ ...prev, [img.src]: true }))}
                            />
                          ) : (
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="space-y-8">
                <div className="pt-2 space-y-3">
                  <h2
                    id={titleId}
                    className="text-4xl font-black text-gray-900 leading-tight mb-2 pr-12 whitespace-normal break-words"
                  >
                    {dish?.name || "Загрузка…"}
                  </h2>

                  {dish && producer && (
                    <Link
                      href={`/producers/${producer.id}`}
                      className="mt-1 flex items-center gap-4 px-5 py-3 rounded-3xl border border-gray-100 bg-[#fff7f1] hover:bg-[#ffe9d6] transition-all shadow-sm cursor-pointer"
                    >
                      {producer.logo_url ? (
                        <img
                          src={producer.logo_url}
                          alt={producer.name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-[#c9825b]">
                          {producer.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-900">
                          {producer.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f4a259">
                              <path d="M12 .587l3.668 7.431 8.207 1.193-5.938 5.79 1.403 8.18L12 18.896l-7.34 3.985 1.403-8.18L.125 9.211l8.207-1.193z" />
                            </svg>
                            <span>{typeof producer.rating === "number" ? producer.rating.toFixed(1) : producer.rating}</span>
                          </span>
                          {producer.city && <span className="text-[11px] text-gray-400">· {producer.city}</span>}
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div className="text-3xl font-black text-[#c9825b]">
                      {discountedPrice !== null ? `${formatNumber(discountedPrice)} ₽` : "—"}
                    </div>
                    {dish?.discount_percentage ? (
                      <div className="text-xl text-gray-400 line-through font-medium">
                        {formatNumber(Math.round(Number(dish.price)))} ₽
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Доставка</h4>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f0e2d6] bg-[#fff7f1] p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("BUILDING")}
                        className={[
                          "px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200",
                          deliveryType === "BUILDING"
                            ? "text-white shadow-md shadow-orange-200"
                            : "bg-white text-gray-400 hover:bg-orange-50/50",
                        ].join(" ")}
                        style={
                          deliveryType === "BUILDING"
                            ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }
                            : undefined
                        }
                      >
                        До подъезда
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("DOOR")}
                        className={[
                          "px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200",
                          deliveryType === "DOOR"
                            ? "text-white shadow-md shadow-orange-200"
                            : "bg-white text-gray-400 hover:bg-orange-50/50",
                        ].join(" ")}
                        style={
                          deliveryType === "DOOR"
                            ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }
                            : undefined
                        }
                      >
                        До двери
                      </button>
                    </div>
                    <AddressCapsule
                      value={deliveryAddress}
                      coords={deliveryCoords ?? undefined}
                      onChange={handleAddressChange}
                      emptyLabel="Выбрать адрес доставки"
                      placeholder="Адрес доставки"
                      buttonClassName="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#fdf2e9] hover:bg-[#ffe1c9] text-[#4b2f23] transition-colors"
                    />
                    {deliveryCoords && (
                      <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                            Стоимость доставки {deliveryType === "DOOR" ? "до двери" : "до подъезда"}
                          </span>
                          <span className="font-bold text-gray-900">
                            {deliveryEstimate
                              ? `${formatNumber(deliveryEstimate.delivery_price)} ₽`
                              : deliveryEstimateLoading
                              ? "Рассчитываем…"
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Итого с доставкой</span>
                          <span className="font-bold text-gray-900">
                            {totalWithDelivery !== null
                              ? `${formatNumber(totalWithDelivery)} ₽`
                              : deliveryEstimateLoading
                              ? "Рассчитываем…"
                              : discountedPrice !== null
                              ? `${formatNumber(discountedPrice)} ₽`
                              : "—"}
                          </span>
                        </div>
                        {typeof deliveryEstimate?.estimated_cooking_time === "number" && deliveryEstimate.estimated_cooking_time > 0 ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Время доставки</span>
                            <span className="font-bold text-gray-900">{deliveryEstimate.estimated_cooking_time} мин</span>
                          </div>
                        ) : null}
                        {deliveryEstimateError && (
                          <div className="text-xs font-semibold text-red-600">
                            {deliveryEstimateError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Описание</h4>
                  <p id={descId} className="text-gray-600 leading-relaxed text-lg">
                    {dish?.description || "—"}
                  </p>
                </div>

                {error ? (
                  <div className="rounded-3xl border p-6 bg-red-50/50 border-red-100">
                    <div className="font-bold text-red-700">Ошибка загрузки</div>
                    <div className="text-sm text-red-600 mt-1">{error}</div>
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="mt-4 bg-white border border-gray-100 px-5 py-2.5 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                    >
                      Повторить
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Вес / Объем</div>
                    <div className="font-bold text-gray-900">{dish?.weight || "—"}</div>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Изготовление</div>
                    <div className="font-bold text-gray-900">{dish?.manufacturing_time || "—"}</div>
                  </div>
                </div>

                {kbju ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">КБЖУ</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Калории</div>
                        <div className="font-black text-gray-900 text-xl">{Math.round(kbju.calories)} ккал</div>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Белки</div>
                        <div className="font-black text-gray-900 text-xl">{formatMacro(kbju.proteins)} г</div>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Жиры</div>
                        <div className="font-black text-gray-900 text-xl">{formatMacro(kbju.fats)} г</div>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Углеводы</div>
                        <div className="font-black text-gray-900 text-xl">{formatMacro(kbju.carbs)} г</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {dish?.composition ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Состав</h4>
                    <p className="text-gray-600 leading-relaxed">{dish.composition}</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 pt-4">
                  {dish?.storage_conditions ? (
                    <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Хранение</span>
                      <span className="font-bold text-gray-900">{dish.storage_conditions}</span>
                    </div>
                  ) : null}
                  {dish?.shelf_life ? (
                    <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Срок годности</span>
                      <span className="font-bold text-gray-900">{dish.shelf_life}</span>
                    </div>
                  ) : null}
                  {dish?.dimensions ? (
                    <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Размеры</span>
                      <span className="font-bold text-gray-900">{dish.dimensions}</span>
                    </div>
                  ) : null}
                </div>

                {toppings.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Добавки</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {toppings.map((topping: any) => {
                        const isSelected = selectedToppings.some(t => t.id === topping.id);
                        return (
                          <button
                            key={topping.id}
                            type="button"
                            onClick={() => toggleTopping(topping)}
                            className={[
                              "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                              isSelected 
                                ? "bg-[#fdf2e9] border-[#c9825b] shadow-sm" 
                                : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                            ].join(" ")}
                          >
                            <div className="flex flex-col">
                              <span className={["font-bold text-sm", isSelected ? "text-[#c9825b]" : "text-gray-900"].join(" ")}>
                                {topping.name}
                              </span>
                              <span className="text-xs text-gray-500">+{formatNumber(topping.price)} ₽</span>
                            </div>
                            <div className={[
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-[#c9825b] border-[#c9825b]" : "border-gray-300"
                            ].join(" ")}>
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

                <div className="pt-4 pb-0">
                  {dish && discountedPrice !== null ? (
                    <AddToCartButton
                      dish={dish.id}
                      minQuantity={dish.min_quantity}
                      maxQuantityPerOrder={dish.max_quantity_per_order}
                      labelPrice={String(discountedPrice)}
                      selectedToppings={selectedToppings}
                    />
                  ) : (
                    <div className="h-[140px] rounded-2xl bg-gray-50 animate-pulse" />
                  )}
                </div>
              </div>
              <div className="clear-both"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
