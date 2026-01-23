"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { updateGiftDetails } from "@/lib/api";

export default function GiftDetailsPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialType = (searchParams.get("type") as "BUILDING" | "DOOR") || "BUILDING";
  const recipientToken = searchParams.get("token");
  const [deliveryType, setDeliveryType] = useState<"BUILDING" | "DOOR">(initialType);
  const [address, setAddress] = useState("");
  const [entrance, setEntrance] = useState("");
  const [apartment, setApartment] = useState("");
  const [floor, setFloor] = useState("");
  const [intercom, setIntercom] = useState("");
  const [timeLocal, setTimeLocal] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async () => {
    if (!recipientToken) {
      setError("Ссылка недействительна. Попросите отправить её ещё раз.");
      return;
    }
    if (!address.trim()) {
      setError("Укажите адрес доставки");
      return;
    }
    if (!entrance.trim()) {
      setError("Укажите подъезд");
      return;
    }
    if (deliveryType === "DOOR") {
      if (!apartment.trim()) {
        setError("Укажите квартиру");
        return;
      }
      if (!floor.trim()) {
        setError("Укажите этаж");
        return;
      }
      if (!intercom.trim()) {
        setError("Укажите домофон");
        return;
      }
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      let timeIso: string | undefined = undefined;
      if (timeLocal) {
        const date = new Date(timeLocal);
        if (!isNaN(date.getTime())) {
          timeIso = date.toISOString();
        }
      }
      const res = await updateGiftDetails(orderId as any, {
        address: address.trim(),
        time: timeIso,
        delivery_type: deliveryType,
        entrance: entrance.trim(),
        apartment: deliveryType === "DOOR" ? apartment.trim() : "",
        floor: deliveryType === "DOOR" ? floor.trim() : "",
        intercom: deliveryType === "DOOR" ? intercom.trim() : "",
        recipient_token: recipientToken,
      });
      setStatus(res.detail || "Данные сохранены");
      setCompleted(true);
    } catch (e: any) {
      const detail = typeof e?.detail === "string" ? e.detail : undefined;
      if (detail === "recipient_link_expired") {
        setError("Срок действия ссылки истёк. Попросите отправить новую ссылку у отправителя.");
      } else if (detail === "Invalid recipient token" || detail === "invalid_recipient_token") {
        setError("Ссылка недействительна. Попросите отправить её ещё раз.");
      } else {
        const fallback =
          detail ??
          (typeof e?.message === "string" ? e.message : "Не удалось сохранить данные");
        setError(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Доставка подарка</h1>
        <p className="text-sm" style={{ color: "#7c6b62" }}>
          Укажите адрес и детали доставки, чтобы мы смогли привезти подарок.
        </p>
      </div>

      <div className="rounded-3xl border border-[#f0e2d6] bg-[#fff9f3] p-4 space-y-3">
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
            style={
              deliveryType === "BUILDING"
                ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }
                : {}
            }
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
            style={
              deliveryType === "DOOR"
                ? { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }
                : {}
            }
          >
            До двери
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Адрес доставки"
          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
        />

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

        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-widest" style={{ color: "#7c6b62" }}>
            Желаемое время доставки
          </label>
          <input
            type="datetime-local"
            value={timeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
          />
          <p className="text-xs" style={{ color: "#7c6b62" }}>
            Можно оставить пустым, если нужно как можно быстрее.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-sm font-bold" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {status && (
        <div
          className="rounded-2xl border-2 border-[#c9825b]/20 bg-[#fff9f3] px-5 py-4 text-sm font-bold flex items-center gap-3"
          style={{ color: "#4b2f23" }}
        >
          <div className="w-8 h-8 rounded-full bg-[#c9825b] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          {status}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || completed}
          className="btn-warm btn-toggle flex-1 py-4 rounded-2xl text-lg font-black shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed"
          style={
            loading || completed
              ? { opacity: 0.85 }
              : { backgroundColor: "#C9825B", color: "#ffffff", borderColor: "#C9825B" }
          }
        >
          {completed ? "Данные отправлены" : loading ? "Отправляем..." : "Отправить данные"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-5 py-4 rounded-2xl border border-gray-200 text-sm font-bold bg-white"
          style={{ color: "#4b2f23" }}
        >
          На главную
        </button>
      </div>
    </div>
  );
}
