"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyGifts, cancelGift, previewGift, type GiftListItem } from "@/lib/api";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
}

const stateOptions = [
  { value: "ALL", label: "Все" },
  { value: "CREATED", label: "Создан" },
  { value: "ACTIVATED", label: "Активирован" },
  { value: "CANCELLED_BY_PAYER", label: "Отменен отправителем" },
  { value: "CANCELLED_BY_SYSTEM_EXPIRED", label: "Истек срок" },
];

const directionOptions = [
  { value: "SENT", label: "Я подарил" },
  { value: "RECEIVED", label: "Мне подарили" },
];

export default function MyGiftsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [gifts, setGifts] = useState<GiftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [direction, setDirection] = useState<"SENT" | "RECEIVED">("SENT");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const t = getCookie("accessToken");
    if (t) {
      setToken(t);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadGifts(token);
  }, [token, stateFilter, direction, dateFrom, dateTo]);

  const buildDateParam = (value: string, end: boolean) => {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    return end ? `${value}T23:59:59Z` : `${value}T00:00:00Z`;
  };

  const loadGifts = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const from = buildDateParam(dateFrom, false);
      const to = buildDateParam(dateTo, true);
      const state = stateFilter === "ALL" ? undefined : stateFilter;
      const data = await getMyGifts(
        {
          state,
          direction,
          from,
          to,
        },
        authToken
      );
      setGifts(data);
    } catch {
      setError("Не удалось загрузить подарки");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (gift: GiftListItem) => {
    if (!token) return;
    if (gift.state !== "CREATED") return;
    try {
      const updated = await cancelGift(gift.id, token);
      setGifts((prev) =>
        prev.map((g) => (g.id === updated.id ? { ...g, ...updated } as GiftListItem : g))
      );
    } catch {
      setError("Не удалось отменить подарок");
    }
  };

  const handlePreview = async (gift: GiftListItem) => {
    if (!gift.activation_token) return;
    setPreviewLoadingId(gift.id);
    try {
      const data = await previewGift(gift.activation_token);
      const lines = [
        data.product_name,
        data.product_description,
        `${data.amount} ₽`,
      ].filter(Boolean);
      window.alert(lines.join("\n"));
    } catch {
      setError("Не удалось получить информацию о подарке");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const formatMoney = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (Number.isNaN(num)) return `${amount} ${currency}`;
    return `${num.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const getStateLabel = (state: string) => {
    if (state === "CREATED") return "Ожидает активации";
    if (state === "ACTIVATED") return "Активирован";
    if (state === "CANCELLED_BY_PAYER") return "Отменен отправителем";
    if (state === "CANCELLED_BY_SYSTEM_EXPIRED") return "Истек срок действия";
    return state;
  };

  const getStateColors = (state: string) => {
    if (state === "CREATED") return "bg-orange-50 text-orange-700";
    if (state === "ACTIVATED") return "bg-green-50 text-green-700";
    if (state === "CANCELLED_BY_PAYER") return "bg-red-50 text-red-700";
    if (state === "CANCELLED_BY_SYSTEM_EXPIRED") return "bg-gray-100 text-gray-600";
    return "bg-gray-50 text-gray-600";
  };

  if (!token && !loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Мои подарки</h1>
        <p className="text-gray-600 text-sm md:text-base">
          Для просмотра истории подарков нужно авторизоваться.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-black text-white"
          style={{ backgroundColor: "#c9825b" }}
        >
          Войти
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Мои подарки</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Отслеживайте подарки, которые вы отправили или получили.
          </p>
        </div>
        <Link
          href="/dishes"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl text-sm font-black text-white shadow-sm"
          style={{ backgroundColor: "#c9825b" }}
        >
          Выбрать подарок
        </Link>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Статус
            </div>
            <select
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9825b]/60"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Роль
            </div>
            <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-50 p-1 border border-gray-200">
              {directionOptions.map((opt) => {
                const active = direction === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDirection(opt.value as "SENT" | "RECEIVED")}
                    className={`flex-1 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? "bg-white text-[#c9825b] shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              С даты
            </div>
            <input
              type="date"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9825b]/60"
              value={dateFrom || ""}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              По дату
            </div>
            <input
              type="date"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9825b]/60"
              value={dateTo || ""}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-500">
            Найдено:{" "}
            <span className="font-semibold text-gray-800">
              {gifts.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (token) {
                loadGifts(token);
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#c9825b]/50 hover:text-[#c9825b]"
          >
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-[#c9825b]/30 border-t-[#c9825b] animate-spin" />
          </div>
        ) : gifts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center space-y-3">
            <div className="text-base md:text-lg font-semibold text-gray-900">
              Пока нет подарков
            </div>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Здесь будут отображаться подарки, которые вы отправляете или получаете.
            </p>
            <Link
              href="/dishes"
              className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-2xl text-sm font-black text-white shadow-sm"
              style={{ backgroundColor: "#c9825b" }}
            >
              Выбрать подарок
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {gifts.map((gift) => {
              const stateLabel = getStateLabel(gift.state);
              const stateColors = getStateColors(gift.state);
              const createdDate = formatDate(gift.created_at);
              const isCreated = gift.state === "CREATED";
              const canCancel = isCreated && direction === "SENT";
              const canPreview = Boolean(isCreated && gift.activation_token);

              return (
                <div
                  key={gift.id}
                  className="bg-white rounded-[24px] border border-gray-100 hover:border-[#c9825b]/30 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs font-semibold text-gray-500">
                          ID подарка:
                          <span className="ml-1 font-mono text-gray-900">
                            {String(gift.id).slice(0, 8)}
                          </span>
                        </div>
                        {gift.gift_code && (
                          <div className="text-xs font-semibold text-gray-500">
                            Код:
                            <span className="ml-1 font-mono text-gray-900">
                              {gift.gift_code}
                            </span>
                          </div>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${stateColors}`}
                        >
                          {stateLabel}
                        </span>
                        {gift.order_state && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700">
                            Заказ: {gift.order_state}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-gray-50 text-gray-600">
                          {direction === "SENT" ? "Я отправил" : "Мне подарили"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Сумма
                          </div>
                          <div className="font-semibold">
                            {formatMoney(gift.amount, gift.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Действителен до
                          </div>
                          <div className="font-medium">
                            {formatDateTime(gift.valid_until)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Активирован
                          </div>
                          <div className="font-medium">
                            {formatDateTime(gift.activated_at)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Создан
                          </div>
                          <div className="font-medium">
                            {createdDate || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 w-full md:w-48">
                      {canPreview && (
                        <button
                          type="button"
                          onClick={() => handlePreview(gift)}
                          disabled={previewLoadingId === gift.id}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-2xl text-xs font-semibold border border-[#c9825b]/40 text-[#c9825b] hover:bg-[#c9825b]/5 disabled:opacity-60"
                        >
                          {previewLoadingId === gift.id ? "Открытие..." : "Предпросмотр"}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(gift)}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-2xl text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Отменить подарок
                        </button>
                      )}
                      {gift.order_id && (
                        <Link
                          href={`/orders#order-${gift.order_id}`}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-2xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          Открыть заказ
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

