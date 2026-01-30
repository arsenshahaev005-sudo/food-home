"use client";

import { useEffect, useState } from "react";
import { getAvailableTimeSlots, TimeSlot } from "@/lib/api";

export default function ScheduledDeliveryPicker({
  dishId,
  quantity,
  token,
  onSelect,
  onClear,
  initialValue,
}: {
  dishId: string;
  quantity: number;
  token?: string;
  onSelect: (datetime: string) => void;
  onClear: () => void;
  initialValue?: string | null;
}) {
  const [deliveryMode, setDeliveryMode] = useState<'ASAP' | 'SCHEDULED'>(
    initialValue ? 'SCHEDULED' : 'ASAP'
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(initialValue);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Load time slots when date changes
  useEffect(() => {
    if (deliveryMode === 'SCHEDULED' && selectedDate && dishId) {
      loadTimeSlots();
    }
  }, [selectedDate, dishId, quantity, deliveryMode]);

  const loadTimeSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getAvailableTimeSlots(dishId, selectedDate, quantity, token);
      setTimeSlots(response.slots);
    } catch (err: any) {
      setError(err.detail || 'Не удалось загрузить доступные слоты');
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'ASAP' | 'SCHEDULED') => {
    setDeliveryMode(mode);
    if (mode === 'ASAP') {
      setSelectedDate('');
      setSelectedTime(null);
      setTimeSlots([]);
      onClear();
    }
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    if (!slot.available) return;

    setSelectedTime(slot.time);
    onSelect(slot.time);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[#f0e2d6] bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => handleModeChange('ASAP')}
          className={`px-5 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
            deliveryMode === 'ASAP'
              ? "text-white shadow-md shadow-orange-200"
              : "bg-white text-gray-400 hover:bg-orange-50/50"
          }`}
          style={deliveryMode === 'ASAP' ? { backgroundColor: "#C9825B", color: "#ffffff" } : {}}
        >
          Как можно скорее
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('SCHEDULED')}
          className={`px-5 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
            deliveryMode === 'SCHEDULED'
              ? "text-white shadow-md shadow-orange-200"
              : "bg-white text-gray-400 hover:bg-orange-50/50"
          }`}
          style={deliveryMode === 'SCHEDULED' ? { backgroundColor: "#C9825B", color: "#ffffff" } : {}}
        >
          Запланировать
        </button>
      </div>

      {/* Scheduled Mode UI */}
      {deliveryMode === 'SCHEDULED' && (
        <div className="space-y-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-black uppercase tracking-widest mb-2" style={{ color: "#7c6b62" }}>
              Выберите дату
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime(null);  // Reset time when date changes
              }}
              min={today}
              max={maxDate}
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
            />
          </div>

          {/* Time Slots Grid */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2" style={{ color: "#7c6b62" }}>
                Выберите время
              </label>

              {loading && (
                <div className="text-center py-8 text-gray-400">
                  Загрузка доступных слотов...
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {!loading && !error && timeSlots.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Нет доступных слотов на эту дату
                </div>
              )}

              {!loading && timeSlots.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleTimeSelect(slot)}
                      className={`
                        px-4 py-3 rounded-2xl text-sm font-black transition-all relative
                        ${slot.available
                          ? selectedTime === slot.time
                            ? 'bg-[#c9825b] text-white shadow-md shadow-orange-200'
                            : 'bg-white border-2 border-gray-100 text-gray-700 hover:border-[#c9825b]/30 hover:bg-orange-50/30'
                          : 'bg-gray-50 border-2 border-gray-100 text-gray-300 cursor-not-allowed'
                        }
                      `}
                      title={slot.reason || undefined}
                    >
                      <div>{slot.display}</div>
                      {!slot.available && slot.reason && (
                        <div className="text-[10px] font-normal mt-1 opacity-60 line-clamp-1">
                          {slot.reason}
                        </div>
                      )}
                      {slot.available && slot.remaining_capacity !== undefined && (
                        <div className="text-[10px] font-normal mt-1 opacity-70">
                          Осталось {slot.remaining_capacity}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Time Display */}
      {deliveryMode === 'SCHEDULED' && selectedTime && (
        <div className="rounded-2xl border border-[#f0e2d6] bg-[#fff9f3] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest" style={{ color: "#7c6b62" }}>
                Запланированная доставка
              </div>
              <div className="text-sm font-bold text-gray-900 mt-1">
                {new Date(selectedTime).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTime(null);
                onClear();
              }}
              className="text-xs font-bold text-gray-400 underline hover:text-gray-600 transition-colors"
            >
              Изменить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
