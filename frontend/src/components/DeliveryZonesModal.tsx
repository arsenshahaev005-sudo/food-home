"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface DeliveryZone {
  name: string;
  radius_km: number;
  price_to_building: number;
  price_to_door: number;
  time_minutes: number;
}

interface DeliveryZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: DeliveryZone[];
  center: { lat: number; lon: number };
}

const ZONE_COLORS = [
  "#4A90E2", // Blue
  "#F5A623", // Orange
  "#27AE60", // Green
  "#50E3C2", // Cyan
  "#FF5A5F", // Red
  "#F8E71C", // Yellow
];

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function DeliveryZonesModal({ isOpen, onClose, zones, center }: DeliveryZonesModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scriptLoaded && window.ymaps && mapContainerRef.current) {
      window.ymaps.ready(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
        }

        const map = new window.ymaps.Map(mapContainerRef.current, {
          center: [center.lat, center.lon],
          zoom: 12,
          controls: ["zoomControl", "fullscreenControl"],
        });

        mapInstanceRef.current = map;

        // Add shop marker
        const placemark = new window.ymaps.Placemark(
          [center.lat, center.lon],
          {
            hintContent: "Ваш магазин",
          },
          {
            preset: "islands#homeIcon",
            iconColor: "#c9825b",
          }
        );
        map.geoObjects.add(placemark);

        // Sort zones by radius descending to draw largest first (so smallest are on top)
        const sortedZones = [...zones].sort((a, b) => b.radius_km - a.radius_km);

        sortedZones.forEach((zone, index) => {
          const color = ZONE_COLORS[index % ZONE_COLORS.length];
          const circle = new window.ymaps.Circle(
            [[center.lat, center.lon], zone.radius_km * 1000],
            {
              hintContent: `${zone.name}: ${zone.radius_km} км`,
            },
            {
              fillColor: color + "44", // Add transparency
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWidth: 2,
            }
          );
          map.geoObjects.add(circle);
        });

        // Auto-fit map to show all zones
        if (zones.length > 0) {
          map.setBounds(map.geoObjects.getBounds(), {
            checkZoomRange: true,
            zoomMargin: 20,
          });
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, scriptLoaded, zones, center]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Script
        src="https://api-maps.yandex.ru/2.1/?lang=ru_RU"
        onLoad={() => setScriptLoaded(true)}
      />
      
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-[warmFadeIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.972.473a2.25 2.25 0 0 0 2.508-1.493l.873-2.555a2.25 2.25 0 0 0-1.676-2.902l-1.972-.473a2.25 2.25 0 0 0-2.508 1.493l-.873 2.555a2.25 2.25 0 0 0 1.676 2.902Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Зоны доставки на карте</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Map Container */}
          <div className="relative h-80 w-full rounded-3xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            {!scriptLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#c9825b]/30 border-t-[#c9825b] rounded-full animate-spin" />
                  <span className="text-sm font-medium">Загрузка карты...</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Стоимость и время</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zones.map((zone, index) => {
                const color = ZONE_COLORS[index % ZONE_COLORS.length];
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-sm">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {zone.name} ({zone.radius_km} км)
                      </p>
                      <p className="text-xs text-gray-500">
                        Цена — {Math.round(zone.price_to_door)} ₽ · {zone.time_minutes} мин
                      </p>
                    </div>
                  </div>
                );
              })}
              {zones.length === 0 && (
                <div className="col-span-2 py-8 text-center text-gray-400 text-sm italic">
                  Добавьте зоны доставки в настройках профиля
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-[#c9825b] text-white rounded-2xl font-bold hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
