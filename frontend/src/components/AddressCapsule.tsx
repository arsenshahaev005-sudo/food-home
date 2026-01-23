"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
const MapPickerLazy = dynamic(() => import("@/components/MapPicker"), { ssr: false });

type Coords = { lat: number; lon: number };
type DeliveryAddressEventDetail = { address: string; coords: Coords | null; storageTextKey: string; storageCoordsKey: string };
const DELIVERY_ADDRESS_EVENT = "delivery_address_updated";

export default function AddressCapsule({
  value,
  coords: coordsProp,
  onChange,
  persist = true,
  storageTextKey = "delivery_address_text",
  storageCoordsKey = "delivery_coords",
  emptyLabel = "Выбрать адрес",
  placeholder = "Адрес доставки",
  buttonClassName = "btn-warm",
}: {
  value?: string;
  coords?: Coords | null;
  onChange?: (value: string, coords: Coords | null) => void;
  persist?: boolean;
  storageTextKey?: string;
  storageCoordsKey?: string;
  emptyLabel?: string;
  placeholder?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [suggestions, setSuggestions] = useState<{ value: string; displayName: string; point?: { lat: number; lon: number } }[]>([]);
  const [ymapsApi, setYmapsApi] = useState<any>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof value === "string") setAddress(value);
  }, [value]);

  useEffect(() => {
    if (coordsProp && typeof coordsProp.lat === "number" && typeof coordsProp.lon === "number") {
      setCoords(coordsProp);
    }
  }, [coordsProp?.lat, coordsProp?.lon]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (!persist) return;
        const a = localStorage.getItem(storageTextKey) || "";
        const c = localStorage.getItem(storageCoordsKey);
        let parsed: Coords | null = null;
        if (c) parsed = JSON.parse(c);

        if (!value && a) setAddress(a);
        if (!coordsProp && parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
          setCoords(parsed);
        } else if ((!a || !value) && !coordsProp && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            setCoords({ lat: latitude, lon: longitude });
          });
        }
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [persist, storageTextKey, storageCoordsKey, value, coordsProp]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DeliveryAddressEventDetail | undefined>).detail;
      if (!detail) return;
      if (detail.storageTextKey !== storageTextKey || detail.storageCoordsKey !== storageCoordsKey) return;
      if (typeof detail.address === "string") setAddress(detail.address);
      const nextCoords = detail.coords;
      if (nextCoords && typeof nextCoords.lat === "number" && typeof nextCoords.lon === "number") setCoords(nextCoords);
      if (nextCoords === null) setCoords(null);
    };
    window.addEventListener(DELIVERY_ADDRESS_EVENT, handler);
    return () => window.removeEventListener(DELIVERY_ADDRESS_EVENT, handler);
  }, [storageTextKey, storageCoordsKey]);

  function onPick(c: { lat: number; lon: number }, text?: string) {
    setCoords(c);
    if (text) setAddress(text);
    setSuggestions([]);
  }

  function save() {
    if (persist) {
      if (address) localStorage.setItem(storageTextKey, address);
      if (coords) localStorage.setItem(storageCoordsKey, JSON.stringify(coords));
    }
    window.dispatchEvent(
      new CustomEvent<DeliveryAddressEventDetail>(DELIVERY_ADDRESS_EVENT, {
        detail: { address, coords, storageTextKey, storageCoordsKey },
      })
    );
    onChange?.(address, coords);
    setOpen(false);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddress(val);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!val || val.length <= 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      // Direct server-side call to avoid ORB and CORS issues on client
      try {
         // Get user location for bias if available
         let url = `/api/geocode?q=${encodeURIComponent(val)}`;
         if (coords) {
             url += `&lat=${coords.lat}&lon=${coords.lon}`;
         }
         
         const response = await fetch(url);
         if (response.ok) {
           const newSuggestions = await response.json();
           setSuggestions(newSuggestions);
         } else {
           const errData = await response.json();
           console.error("Geocode API error", response.status, errData);
         }
      } catch (geoErr) {
         console.error("Geocode fetch error", geoErr);
      }
    }, 500); // 500ms debounce
  };

  const handleSuggestionClick = (suggestion: { value: string; displayName: string; point?: { lat: number; lon: number } }) => {
    setAddress(suggestion.value);
    setSuggestions([]);
    
    // If point is available, use it directly to update map
    if (suggestion.point && window.__mapPickerGeocode) {
       // Pass coordinates as array [lat, lon] to map picker (which now handles it)
       window.__mapPickerGeocode([suggestion.point.lat, suggestion.point.lon]);
    } else if (window.__mapPickerGeocode) {
      // Fallback to text search if point is missing (should happen less now)
      window.__mapPickerGeocode(suggestion.value);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        {address 
          ? (address.length > 40 
              ? address.slice(0, 37) + "..." 
              : address)
          : emptyLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.25)", animation: "warmFadeIn 200ms ease both", zIndex: 50 }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            const modal = document.getElementById("address-modal");
            if (modal && !modal.contains(target)) setOpen(false);
          }}
        >
          <div
            id="address-modal"
            className="w-full max-w-xl p-4 space-y-3"
            style={{ backgroundColor: "#fcf8f3", borderRadius: "20px", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <input 
                  id="address-input" 
                  value={address} 
                  onChange={handleInputChange} 
                  placeholder={placeholder} 
                  className="w-full rounded border px-3 py-2" 
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded border bg-white shadow-lg z-50">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => handleSuggestionClick(s)}
                      >
                        <div className="font-medium text-gray-900">{s.value}</div>
                        <div className="text-xs text-gray-500">{s.displayName}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button 
                onClick={() => (window.__mapPickerGeocode ? window.__mapPickerGeocode(address) : undefined)} 
                className="rounded px-3 py-2" 
                style={{ 
                  backgroundColor: hoveredButton === "search" ? "#c9825b" : "#fcf8f3", 
                  boxShadow: "var(--shadow-soft)", 
                  color: hoveredButton === "search" ? "#ffffff" : "#4b2f23",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={() => setHoveredButton("search")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Найти
              </button>
              <button
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert("Геолокация не поддерживается в этом браузере");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setCoords({ lat: latitude, lon: longitude });
                      if (window.__mapPickerGeocode) window.__mapPickerGeocode([latitude, longitude]);
                    },
                    () => {
                      alert("Не удалось получить местоположение. Проверьте разрешения браузера.");
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
                  );
                }}
                className="rounded px-3 py-2"
                style={{ 
                  backgroundColor: hoveredButton === "location" ? "#c9825b" : "#fcf8f3", 
                  boxShadow: "var(--shadow-soft)", 
                  color: hoveredButton === "location" ? "#ffffff" : "#4b2f23",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={() => setHoveredButton("location")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Моё местоположение
              </button>
            </div>
            <MapPickerLazy onChange={onPick} initial={coords ?? undefined} onApiReady={setYmapsApi} />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setOpen(false)} 
                className="rounded-full px-4 py-2" 
                style={{ 
                  backgroundColor: hoveredButton === "cancel" ? "#c9825b" : "#fcf8f3", 
                  boxShadow: "var(--shadow-soft)", 
                  color: hoveredButton === "cancel" ? "#ffffff" : "#4b2f23",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={() => setHoveredButton("cancel")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Отмена
              </button>
              <button 
                onClick={save} 
                className="rounded-full px-4 py-2" 
                style={{ 
                  backgroundColor: hoveredButton === "save" ? "#c9825b" : "#fcf8f3", 
                  boxShadow: "var(--shadow-soft)",
                  color: hoveredButton === "save" ? "#ffffff" : "#4b2f23",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={() => setHoveredButton("save")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
