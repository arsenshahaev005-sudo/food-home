"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { cartClear, cartRemove, createOrder, payOrder, initOrderPayment, getOrderSbpQr, estimateOrder } from "@/lib/api";
import { useRouter } from "next/navigation";

type Item = { id: string; dish: string; quantity: number; price: number; selected_toppings?: any[] };
type Coords = { lat: number; lon: number };
type DeliveryAddressEventDetail = { address: string; coords: Coords | null; storageTextKey: string; storageCoordsKey: string };
const DELIVERY_ADDRESS_EVENT = "delivery_address_updated";
const STORAGE_TEXT_KEY = "delivery_address_text";
const STORAGE_COORDS_KEY = "delivery_coords";
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

type CheckoutDoneOrder = { id: string; pay_status?: string; pay_error?: string };
type CheckoutDoneResult = { orders: CheckoutDoneOrder[] };

function OrderPaymentCard({ orderId, index, token, payStatus }: { orderId: string; index: number; token?: string; payStatus?: string }) {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(!!payStatus && payStatus !== "WAITING_FOR_PAYMENT");

  const handlePayCard = async () => {
    setLoading(true);
    setError(null);
    try {
      // DEMO MODE: Instead of real Tinkoff redirect, simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call payOrder to update backend status from WAITING_FOR_PAYMENT
      await payOrder(orderId as any, token);
      
      setIsPaid(true);
      alert("Демо-режим: Оплата успешно инициирована!");
      // For demo, we just set a fake URL
      setPaymentUrl("https://demo.tinkoff.ru/pay/success");
    } catch (e: any) {
      setError(e.detail || "Ошибка связи с банком");
    } finally {
      setLoading(false);
    }
  };

  const handlePaySbp = async () => {
    setLoading(true);
    setError(null);
    try {
      // First init payment if not already done
      let pId = "";
      const initRes = await initOrderPayment(orderId, token);
      if (initRes.Success) {
        pId = initRes.PaymentId;
      } else {
        throw new Error(initRes.Message || "Ошибка инициализации");
      }

      const qrRes = await getOrderSbpQr(orderId, token);
      if (qrRes.Success && qrRes.Data) {
        setQrData(qrRes.Data);
      } else {
        setError(qrRes.Message || "Ошибка СБП");
      }
    } catch (e: any) {
      setError(e.message || e.detail || "Ошибка СБП");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-gray-100 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Заказ #{index + 1}</span>
        {isPaid ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full uppercase">Оплачено</span>
        ) : (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full uppercase">Ожидает оплаты</span>
        )}
      </div>

      {error && <div className="text-red-500 text-xs font-bold">{error}</div>}

      {qrData ? (
        <div className="text-center space-y-3">
          <div className="bg-gray-50 p-4 rounded-2xl inline-block">
            {/* Simple QR representation or link */}
            <a href={qrData} target="_blank" className="block p-4 bg-white border-2 border-[#c9825b] rounded-xl text-[#c9825b] font-black">
              Открыть СБП
            </a>
          </div>
          <p className="text-xs text-gray-400">Нажмите, чтобы перейти в приложение банка</p>
          <button onClick={() => setQrData(null)} className="text-xs font-bold text-gray-400 underline">Выбрать другой способ</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePayCard}
            disabled={loading || isPaid}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-50 hover:border-[#c9825b]/30 hover:bg-orange-50/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9825b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <span className="text-xs font-black text-gray-700">Картой</span>
          </button>

          <button
            onClick={handlePaySbp}
            disabled={loading || isPaid}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-50 hover:border-[#c9825b]/30 hover:bg-orange-50/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 11l5 5 5-5M7 7l5 5 5-5" />
              </svg>
            </div>
            <span className="text-xs font-black text-gray-700">СБП</span>
          </button>
        </div>
      )}

      {paymentUrl && !qrData && (
        <div className="text-center">
          <a href={paymentUrl} target="_blank" className="text-xs font-bold text-[#c9825b] underline">
            Окно оплаты открыто в новой вкладке
          </a>
        </div>
      )}
    </div>
  );
}

export default function CheckoutForm({
  items,
  token,
  onBusyChange,
  onSuccess,
  onError,
  defaultCity,
}: {
  items: Item[];
  token?: string;
  onBusyChange?: (busy: boolean) => void;
  onSuccess?: (result: CheckoutDoneResult) => void;
  onError?: (message: string) => void;
  defaultCity?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [initialCoords, setInitialCoords] = useState<Coords | undefined>(undefined);
  const [addressQuery, setAddressQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<any[]>([]);
  const [deselectedDishIds, setDeselectedDishIds] = useState<string[]>([]);
  const [deliveryType, setDeliveryType] = useState<"BUILDING" | "DOOR">("BUILDING");
  const [isUrgent, setIsUrgent] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [intercom, setIntercom] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const [acceptOffer, setAcceptOffer] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptReceipts, setAcceptReceipts] = useState(false);
  const [useAlternativeAddress, setUseAlternativeAddress] = useState(false);
  const [askRecipientAddress, setAskRecipientAddress] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState<{ delivery_price: number; total_price: number; estimated_cooking_time: number } | null>(null);
  const [deliveryEstimateLoading, setDeliveryEstimateLoading] = useState(false);
  const [deliveryEstimateError, setDeliveryEstimateError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const a = localStorage.getItem(STORAGE_TEXT_KEY) || "";
      const c = localStorage.getItem(STORAGE_COORDS_KEY);
      let parsed: Coords | null = null;
      if (c) parsed = JSON.parse(c);
      if (a) setAddressQuery(a);
      if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
        setCoords(parsed);
        setInitialCoords(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const addr = addressQuery.trim();
    if (!addr) return;
    let cancelled = false;
    const run = async () => {
      try {
        let url = `/api/geocode?q=${encodeURIComponent(addr)}`;
        if (coords && typeof coords.lat === "number" && typeof coords.lon === "number") {
          url += `&lat=${coords.lat}&lon=${coords.lon}`;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const list: any[] = await res.json();
        if (!Array.isArray(list) || list.length === 0) return;
        const first = list[0];
        const point = first?.point;
        if (!point || typeof point.lat !== "number" || typeof point.lon !== "number") return;
        if (cancelled) return;
        const next: Coords = { lat: point.lat, lon: point.lon };
        setCoords(next);
        try {
          localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(next));
        } catch {}
      } catch {}
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [addressQuery]);

  useEffect(() => {
    if (!token) {
      setDeliveryEstimate(null);
      setDeliveryEstimateError(null);
      return;
    }
    if (!coords) {
      setDeliveryEstimate(null);
      setDeliveryEstimateError(null);
      return;
    }
    const currentSelected = items.filter(
      (it) => !deselectedDishIds.includes(buildCartItemKey(it.dish, it.selected_toppings))
    );
    if (!currentSelected.length) {
      setDeliveryEstimate(null);
      setDeliveryEstimateError(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setDeliveryEstimateLoading(true);
      setDeliveryEstimateError(null);
      try {
        const perItemResults: { delivery_price: number; total_price: number; estimated_cooking_time?: number }[] = [];
        let remainingPromo = promoCode.trim();
        for (const it of currentSelected) {
          const body: any = {
            dish: it.dish,
            quantity: it.quantity,
            delivery_latitude: coords.lat,
            delivery_longitude: coords.lon,
            delivery_type: deliveryType,
          };
          if (remainingPromo) {
            body.promo_code_text = remainingPromo;
            remainingPromo = "";
          }
          const res = await estimateOrder(body, token);
          perItemResults.push(res);
        }
        if (cancelled) return;
        const totalDelivery = perItemResults.reduce(
          (sum, r) => sum + (typeof r.delivery_price === "number" ? r.delivery_price : 0),
          0
        );
        const totalTotal = perItemResults.reduce(
          (sum, r) => sum + (typeof r.total_price === "number" ? r.total_price : 0),
          0
        );
        const maxTime = perItemResults.reduce((max, r) => {
          const t = typeof r.estimated_cooking_time === "number" ? r.estimated_cooking_time : 0;
          return t > max ? t : max;
        }, 0);
        setDeliveryEstimate({
          delivery_price: totalDelivery,
          total_price: totalTotal,
          estimated_cooking_time: maxTime,
        });
      } catch (e: any) {
        if (cancelled) return;
        const detail =
          typeof e?.detail === "string"
            ? e.detail
            : typeof e?.message === "string"
              ? e.message
              : "Не удалось рассчитать доставку";
        setDeliveryEstimate(null);
        setDeliveryEstimateError(detail);
      } finally {
        if (!cancelled) {
          setDeliveryEstimateLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, coords, deliveryType, isUrgent, promoCode, items, deselectedDishIds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DeliveryAddressEventDetail | undefined>).detail;
      if (!detail) return;
      if (detail.storageTextKey !== STORAGE_TEXT_KEY || detail.storageCoordsKey !== STORAGE_COORDS_KEY) return;
      if (typeof detail.address === "string") setAddressQuery(detail.address);
      const nextCoords = detail.coords;
      if (nextCoords && typeof nextCoords.lat === "number" && typeof nextCoords.lon === "number") {
        setCoords({ lat: nextCoords.lat, lon: nextCoords.lon });
      }
      if (nextCoords === null) setCoords(null);
    };
    window.addEventListener(DELIVERY_ADDRESS_EVENT, handler);
    return () => window.removeEventListener(DELIVERY_ADDRESS_EVENT, handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_DESELECTED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setDeselectedDishIds(parsed.filter((x): x is string => typeof x === "string"));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CartSelectionEventDetail | undefined>).detail;
      if (!detail) return;
      if (detail.storageKey !== CART_DESELECTED_STORAGE_KEY) return;
      setDeselectedDishIds(detail.deselected);
    };
    window.addEventListener(CART_SELECTION_EVENT, handler);
    return () => window.removeEventListener(CART_SELECTION_EVENT, handler);
  }, []);

  const selectedItems = items.filter(
    (it) => !deselectedDishIds.includes(buildCartItemKey(it.dish, it.selected_toppings))
  );
  const selectedTotal = selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const persistAddress = (nextAddress: string, nextCoords: Coords | null) => {
    try {
      if (nextAddress) localStorage.setItem(STORAGE_TEXT_KEY, nextAddress);
      if (nextCoords) localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(nextCoords));
    } catch {}
    window.dispatchEvent(
      new CustomEvent<DeliveryAddressEventDetail>(DELIVERY_ADDRESS_EVENT, {
        detail: {
          address: nextAddress,
          coords: nextCoords,
          storageTextKey: STORAGE_TEXT_KEY,
          storageCoordsKey: STORAGE_COORDS_KEY,
        },
      })
    );
  };

  async function doGeocode() {
    if (window.__mapPickerGeocode) {
      await window.__mapPickerGeocode(addressQuery);
    }
  }

  async function submit() {
    if (!token) { setStatus("Нужна авторизация"); return; }
    if (!addressQuery.trim()) { setStatus("Введите адрес доставки"); return; }
    if (!coords) { setStatus("Отметьте адрес на карте"); return; }
    if (!name.trim() || !phone) { setStatus("Введите имя и телефон"); return; }
    if (deliveryType === "DOOR") {
      if (!apartment.trim()) { setStatus("Укажите квартиру"); return; }
      if (!floor.trim()) { setStatus("Укажите этаж"); return; }
      if (!intercom.trim()) { setStatus("Укажите домофон"); return; }
    }
    if (!selectedItems.length) { setStatus("Выберите хотя бы одну позицию"); return; }
    if (!acceptOffer || !acceptPrivacy || !acceptReceipts) { setStatus("Нужно подтвердить согласия"); return; }
    setLoading(true); setStatus(null);
    onBusyChange?.(true);
    try {
      const doneOrders: CheckoutDoneOrder[] = [];
      for (const it of selectedItems) {
        const body: any = {
          user_name: name.trim(),
          phone,
          dish: it.dish,
          quantity: it.quantity,
          delivery_type: deliveryType,
          is_urgent: isUrgent,
          promo_code_text: promoCode.trim() ? promoCode.trim() : undefined,
          selected_toppings: it.selected_toppings,
          apartment: deliveryType === "DOOR" ? apartment.trim() : undefined,
          entrance: entrance.trim(),
          floor: deliveryType === "DOOR" ? floor.trim() : undefined,
          intercom: deliveryType === "DOOR" ? intercom.trim() : undefined,
          delivery_comment: deliveryComment.trim(),
        };
        if (coords) {
          body.delivery_latitude = coords.lat;
          body.delivery_longitude = coords.lon;
        }
        if (addressQuery.trim()) {
          body.delivery_address_text = addressQuery;
        }
        const created = await createOrder(body, token);
        let payStatus: string | undefined = undefined;
        let smsError: string | undefined = undefined;
        try {
          const payRes = await payOrder(created.id as any, token);
          if (payRes && typeof payRes.status === "string") {
            payStatus = payRes.status;
          }
        } catch (e: any) {
          const detail =
            typeof e?.detail === "string"
              ? e.detail
              : typeof e?.message === "string"
                ? e.message
                : "Ошибка оплаты заказа";
          smsError = smsError || detail;
        }
        doneOrders.push({ id: created.id, pay_status: payStatus, pay_error: smsError });
      }
      
      setCreatedOrders(doneOrders);
      setShowPayment(true);

      if (selectedItems.length === items.length) {
        await cartClear(token);
      } else {
        for (const it of selectedItems) {
          await cartRemove(it.dish, token, it.selected_toppings);
        }
      }
      try {
        const selectedKeys = new Set(
          selectedItems.map((x) => buildCartItemKey(x.dish, x.selected_toppings))
        );
        const existing = deselectedDishIds.filter((id) => !selectedKeys.has(id));
        if (existing.length) localStorage.setItem(CART_DESELECTED_STORAGE_KEY, JSON.stringify(existing));
        else localStorage.removeItem(CART_DESELECTED_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent<CartSelectionEventDetail>(CART_SELECTION_EVENT, {
            detail: { deselected: existing, storageKey: CART_DESELECTED_STORAGE_KEY },
          })
        );
      } catch {}
      setStatus(
        doneOrders.length === 1
          ? "Заказ оформлен"
          : `Оформлено заказов: ${doneOrders.length}`
      );
      onSuccess?.({ orders: doneOrders });
    } catch (e: any) {
      const detail =
        typeof e?.detail === "string"
          ? e.detail
          : typeof e?.message === "string"
            ? e.message
            : "Ошибка оформления заказа";
      setStatus(detail);
      onError?.(detail);
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  if (showPayment) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900">Заказ оформлен!</h2>
          <p className="text-gray-500">Осталось оплатить, чтобы продавцы приступили к работе.</p>
        </div>

        <div className="space-y-3">
          {createdOrders.map((order, idx) => (
            <OrderPaymentCard key={order.id} orderId={order.id} index={idx} token={token} payStatus={order.pay_status} />
          ))}
        </div>

        <button
          onClick={() => {
            setShowPayment(false);
            onSuccess?.({ orders: createdOrders });
          }}
          className="w-full py-4 rounded-2xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Вернуться в корзину
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Выбор типа доставки в самом начале */}
      <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-black uppercase tracking-widest" style={{ color: "#7c6b62" }}>
            Способ получения
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f0e2d6] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDeliveryType("BUILDING")}
              className={`px-5 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                deliveryType === "BUILDING"
                  ? "text-white shadow-md shadow-orange-200"
                  : "bg-white text-gray-400 hover:bg-orange-50/50"
              }`}
              style={deliveryType === "BUILDING" ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" } : {}}
            >
              До подъезда
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("DOOR")}
              className={`px-5 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                deliveryType === "DOOR"
                  ? "text-white shadow-md shadow-orange-200"
                  : "bg-white text-gray-400 hover:bg-orange-50/50"
              }`}
              style={deliveryType === "DOOR" ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" } : {}}
            >
              До двери
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useAlternativeAddress}
              onChange={(e) => {
                setUseAlternativeAddress(e.target.checked);
                if (e.target.checked) {
                  setAskRecipientAddress(false);
                }
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300"
              style={{ accentColor: "#c9825b" }}
            />
            <div className="min-w-0">
              <div className="font-black text-sm text-gray-900">Отправить на другой адрес</div>
              <div className="text-xs" style={{ color: "#7c6b62" }}>
                Укажите адрес получателя, отличный от адреса доставки
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={askRecipientAddress}
              onChange={(e) => {
                setAskRecipientAddress(e.target.checked);
                if (e.target.checked) {
                  setUseAlternativeAddress(false);
                }
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300"
              style={{ accentColor: "#c9825b" }}
            />
            <div className="min-w-0">
              <div className="font-black text-sm text-gray-900">Узнать адрес у получателя</div>
              <div className="text-xs" style={{ color: "#7c6b62" }}>
                Продавец свяжется с получателем для уточнения адреса
              </div>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя получателя"
            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
            autoComplete="name"
          />
          <div className="rounded-2xl border border-gray-100 bg-gray-50 focus-within:ring-2 focus-within:ring-[#c9825b]/20 focus-within:border-[#c9825b] transition-all overflow-hidden px-5 py-[11px]">
            <PhoneInput
              international
              defaultCountry="RU"
              value={phone}
              onChange={(val) => setPhone(val || "")}
              className="phone-input-custom w-full bg-transparent"
              placeholder="Телефон"
            />
          </div>
        </div>


        <div className="flex gap-2 items-center">
          <div
            className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium min-w-0"
            style={{ color: "#4b2f23" }}
          >
            {addressQuery || "Адрес доставки не выбран. Выберите адрес в шапке сайта."}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                placeholder="Подъезд"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
              />
              {deliveryType === "DOOR" && (
                <>
                  <input
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="Кв/офис"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                  />
                  <input
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Этаж"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                  />
                  <input
                    value={intercom}
                    onChange={(e) => setIntercom(e.target.value)}
                    placeholder="Домофон"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                  />
                </>
              )}
            </div>
          <textarea
            value={deliveryComment}
            onChange={(e) => setDeliveryComment(e.target.value)}
            placeholder="Комментарий для курьера"
            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium resize-none h-24"
          />
        </div>
      </div>

      {coords && (
        <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-4 space-y-2">
          <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
            <span>Доставка</span>
            <span className="font-bold text-gray-900">
              {deliveryEstimate
                ? `${Math.round(deliveryEstimate.delivery_price)} ₽`
                : deliveryEstimateLoading
                ? "Рассчитываем…"
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
            <span>Итого с доставкой</span>
            <span className="font-bold text-gray-900">
              {deliveryEstimate
                ? `${Math.round(deliveryEstimate.total_price)} ₽`
                : deliveryEstimateLoading
                ? "Рассчитываем…"
                : "—"}
            </span>
          </div>
          {deliveryEstimateError && (
            <div className="text-xs font-bold text-red-500">
              {deliveryEstimateError}
            </div>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-4 space-y-3">
        <label className="flex items-start gap-3 rounded-2xl border border-[#f0e2d6] bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: "#c9825b" }}
          />
          <div className="min-w-0">
            <div className="font-black text-sm text-gray-900">Срочно</div>
            <div className="text-xs" style={{ color: "#7c6b62" }}>
              Уменьшаем время на подтверждение заказа продавцом
            </div>
          </div>
        </label>

        <div className="space-y-2">
          <div className="text-sm font-black uppercase tracking-widest" style={{ color: "#7c6b62" }}>
            Промокод
          </div>
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Если есть промокод"
            className="w-full px-5 py-3.5 bg-white border border-[#f0e2d6] rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
          />
          <div className="text-xs" style={{ color: "#7c6b62" }}>
            Если оформляется несколько заказов, промокод применяется к одному из них.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={acceptOffer}
            onChange={(e) => setAcceptOffer(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: "#c9825b" }}
          />
          <div className="text-sm" style={{ color: "#4b2f23" }}>
            Принимаю условия{" "}
            <Link href="/legal/offer" className="font-black underline decoration-[#c9825b]/60 underline-offset-2">
              публичной оферты
            </Link>
            .
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: "#c9825b" }}
          />
          <div className="text-sm" style={{ color: "#4b2f23" }}>
            Даю согласие на обработку персональных данных и принимаю{" "}
            <Link href="/legal/privacy" className="font-black underline decoration-[#c9825b]/60 underline-offset-2">
              политику конфиденциальности
            </Link>
            .
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={acceptReceipts}
            onChange={(e) => setAcceptReceipts(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: "#c9825b" }}
          />
          <div className="text-sm" style={{ color: "#4b2f23" }}>
            Согласен(на) получать уведомления и электронные чеки по заказу на телефон.
          </div>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
          <span>К оформлению</span>
          <span className="font-bold text-gray-900">
            {selectedItems.length} поз. · {Math.round(selectedTotal)} ₽
          </span>
        </div>
        {deliveryEstimate && (
          <>
            <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
              <span>Доставка</span>
              <span className="font-bold text-gray-900">
                {Math.round(deliveryEstimate.delivery_price)} ₽
              </span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: "#7c6b62" }}>
              <span>Итого ориентировочно</span>
              <span className="font-bold text-gray-900">
                {Math.round(deliveryEstimate.total_price)} ₽
              </span>
            </div>
            <div className="text-xs" style={{ color: "#7c6b62" }}>
              Ориентировочное время доставки: {deliveryEstimate.estimated_cooking_time} мин
            </div>
          </>
        )}
        {!deliveryEstimate && !deliveryEstimateLoading && (
          <div className="text-xs" style={{ color: "#7c6b62" }}>
            Укажите адрес доставки, чтобы увидеть стоимость доставки и итоговую сумму.
          </div>
        )}
        {deliveryEstimateLoading && (
          <div className="text-xs" style={{ color: "#7c6b62" }}>
            Рассчитываем стоимость доставки...
          </div>
        )}
        {deliveryEstimateError && (
          <div className="text-xs font-bold text-red-500">
            {deliveryEstimateError}
          </div>
        )}
        
        {status ? (
          <div className="rounded-2xl border-2 border-[#c9825b]/20 bg-[#fff9f3] px-5 py-4 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300" style={{ color: "#4b2f23" }}>
            <div className="w-8 h-8 rounded-full bg-[#c9825b] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            {status}
          </div>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="btn-warm btn-toggle w-full py-4 rounded-2xl text-lg font-black shadow-lg shadow-orange-200"
          style={loading ? { opacity: 0.8 } : { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }}
        >
          {loading ? "Оформление..." : "Оформить заказ"}
        </button>
      </div>
    </div>
  );
}

export function CheckoutModal({ items, token, defaultCity }: { items: Item[]; token?: string; defaultCity?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CheckoutDoneResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const canOpen = !!token && items.length > 0;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setDone(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  useEffect(() => {
    if (!open) {
      setDone(null);
      setErrorMessage(null);
    }
  }, [open]);

  const statusTitle = (s?: string) => {
    if (s === "WAITING_FOR_ACCEPTANCE") return "Ожидает подтверждения";
    if (s === "WAITING_FOR_RECIPIENT") return "Ожидает данных получателя";
    if (s === "WAITING_FOR_PAYMENT") return "Ожидает оплаты";
    if (s === "COOKING") return "Готовится";
    if (s === "COMPLETED") return "Завершён";
    if (s === "CANCELLED") return "Отменён";
    return s ? "В обработке" : "В обработке";
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <div className="text-xl font-black text-gray-900">Оформление заказа</div>
          <div className="text-sm mt-1" style={{ color: "#7c6b62" }}>
            Данные и адрес указываются в модальном окне
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm" style={{ color: "#7c6b62" }}>
            {items.length} поз. · {Math.round(selectedTotal)} ₽
          </div>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setErrorMessage(null);
              setOpen(true);
            }}
            disabled={!canOpen}
            className="btn-warm btn-toggle px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={canOpen ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" } : undefined}
          >
            Оформить
          </button>
        </div>

        {!token ? (
          <div className="text-sm" style={{ color: "#7c6b62" }}>
            Для оформления нужна авторизация
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-3 md:p-6">
          <div
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(6px)" }}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg bg-card border border-[var(--border-warm)] rounded-[32px] shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-[var(--border-warm)]">
              <div className="min-w-0">
                <div className="text-lg md:text-xl font-black text-gray-900 truncate">
                  {done ? "Заказ оформлен" : errorMessage ? "Ошибка оформления" : "Оформление заказа"}
                </div>
                <div className="text-xs md:text-sm" style={{ color: "#7c6b62" }}>
                  {done ? "Готово" : errorMessage ? "Попробуйте ещё раз" : "Проверьте данные перед подтверждением"}
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="w-11 h-11 rounded-2xl border border-gray-100 bg-white font-black"
                style={{ boxShadow: "var(--shadow-soft)" }}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto px-5 md:px-6 py-5">
              {done ? (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#f0e2d6] flex items-center justify-center shrink-0">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#2f7a4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-black text-gray-900">Заказ оформлен</div>
                        <div className="text-sm mt-1" style={{ color: "#7c6b62" }}>
                          {done.orders.length === 1 ? "Мы передали заказ продавцу" : `Мы передали продавцам ${done.orders.length} заказа(ов)`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-black uppercase tracking-widest" style={{ color: "#7c6b62" }}>
                      Номера заказов
                    </div>
                    <div className="space-y-2">
                      {done.orders.map((o) => (
                        <div key={o.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="font-black text-sm text-gray-900 truncate">{o.id}</div>
                            <div className="text-xs font-black px-3 py-1 rounded-full border border-[#f0e2d6] bg-[#fff9f3]" style={{ color: "#7c6b62" }}>
                              {statusTitle(o.pay_status)}
                            </div>
                          </div>
                          {o.pay_error ? (
                            <div className="text-xs mt-2" style={{ color: "#7c6b62" }}>
                              {o.pay_error}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Link
                      href="/orders"
                      className="btn-warm py-4 rounded-2xl text-center font-black shadow-lg shadow-orange-200"
                      style={{ backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }}
                    >
                      Перейти к заказам
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        router.refresh();
                        close();
                      }}
                      className="w-full py-4 rounded-2xl text-center font-black text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#f0e2d6] flex items-center justify-center shrink-0">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18" stroke="#b42318" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6 6L18 18" stroke="#b42318" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-black text-gray-900">Не удалось оформить</div>
                        <div className="text-sm mt-1" style={{ color: "#7c6b62" }}>
                          {errorMessage}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button type="button" onClick={() => setErrorMessage(null)} className="btn-warm">
                      Попробовать снова
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="btn-warm btn-toggle px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-[#c9825b]/20"
                      style={{ backgroundColor: "#c9825b", color: "#ffffff" }}
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              ) : (
                <CheckoutForm
                  items={items}
                  token={token}
                  defaultCity={defaultCity}
                  onBusyChange={setBusy}
                  onSuccess={(r) => {
                    setErrorMessage(null);
                    setDone(r);
                  }}
                  onError={(msg) => {
                    setDone(null);
                    setErrorMessage(msg);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
