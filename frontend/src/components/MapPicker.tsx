"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Types for 2GIS MapGL
declare global {
  interface Window {
    mapgl: any;
    __mapPickerGeocode?: (query: string | number[]) => Promise<void>;
  }
}

type Coords = { lat: number; lon: number };

export default function MapPicker({
  onChange,
  initial,
  onApiReady,
  defaultCity = "Москва",
}: {
  onChange: (coords: Coords, addressText?: string) => void;
  initial?: Coords;
  onApiReady?: (api: any) => void;
  defaultCity?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_2GIS_API_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.mapgl) return;

    const el = containerRef.current as HTMLElement;
    
    // Ensure container is empty
    if (el.innerHTML !== "") {
        el.innerHTML = "";
    }

    // Initialize 2GIS Map
    // Coordinates in 2GIS MapGL are [lon, lat] (GeoJSON standard)
    const moscow = [37.618423, 55.751244];
    const center = initial ? [initial.lon, initial.lat] : moscow;
    
    const initMap = async () => {
      // If no initial coords, try to geocode defaultCity to center the map
      let finalCenter = center;
      if (!initial && defaultCity && defaultCity !== "Москва") {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(defaultCity)}`);
          if (res.ok) {
            const suggestions = await res.json();
            if (suggestions.length > 0 && suggestions[0].point) {
              finalCenter = [suggestions[0].point.lon, suggestions[0].point.lat];
            }
          }
        } catch (err) {
          console.error("Failed to geocode default city", err);
        }
      }

      if (!el) return;

      const map = new window.mapgl.Map(el, {
        center: finalCenter,
        zoom: initial ? 16 : 12,
        key: apiKey,
      });
      mapInstanceRef.current = map;

      // Add initial marker if exists
      if (initial) {
         markerRef.current = new window.mapgl.Marker(map, {
           coordinates: [initial.lon, initial.lat],
         });
      }

      // Handle click on map
      map.on('click', async (e: any) => {
        const [lon, lat] = e.lngLat;
        
        if (markerRef.current) {
          markerRef.current.destroy();
        }
        markerRef.current = new window.mapgl.Marker(map, {
          coordinates: [lon, lat],
        });

        onChange({ lat, lon });
        
        try {
           const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
           if (res.ok) {
             const suggestions = await res.json();
             if (suggestions.length > 0) {
                let addr = suggestions[0].value;
                // Clean up address if it starts with "г. Москва" but we are in another city
                if (defaultCity && defaultCity !== "Москва" && addr.includes(defaultCity)) {
                  // If it contains our city, remove "Москва" if it's there at the beginning
                  addr = addr.replace(/^г\.\s*Москва,\s*/i, "");
                  addr = addr.replace(/^Москва,\s*/i, "");
                  addr = addr.replace(/^город\s*Москва,\s*/i, "");
                }
                onChange({ lat, lon }, addr);
             }
           }
        } catch (err) {
           console.error("Reverse geocode error", err);
        }
      });

      // Expose geocode function
      window.__mapPickerGeocode = async (query: string | number[]) => {
        if (Array.isArray(query)) {
           const [lat, lon] = query;
           map.setCenter([lon, lat]);
           map.setZoom(16);
           
           if (markerRef.current) markerRef.current.destroy();
           markerRef.current = new window.mapgl.Marker(map, { coordinates: [lon, lat] });
           
           onChange({ lat, lon });
           
           // Also reverse geocode when moving via external call (e.g. AddressCapsule suggestion)
           try {
             const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
             if (res.ok) {
               const suggestions = await res.json();
               if (suggestions.length > 0) {
                  let addr = suggestions[0].value;
                  if (defaultCity && defaultCity !== "Москва" && addr.includes(defaultCity)) {
                    addr = addr.replace(/^г\.\s*Москва,\s*/i, "");
                    addr = addr.replace(/^Москва,\s*/i, "");
                    addr = addr.replace(/^город\s*Москва,\s*/i, "");
                  }
                  onChange({ lat, lon }, addr);
               }
             }
           } catch {}
        }
      };
      
      if (onApiReady) onApiReady(map);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      window.__mapPickerGeocode = undefined;
    };
  }, [ready, initial, onChange, apiKey, defaultCity, onApiReady]);

  return (
    <div className="space-y-2">
      {apiKey ? (
        <Script
          src="https://mapgl.2gis.com/api/js/v1"
          strategy="afterInteractive"
          onLoad={() => setReady(true)}
          onError={() => setError("Не удалось загрузить 2GIS Карты")}
        />
      ) : null}
      <div className="relative">
        <div ref={containerRef} className="h-64 w-full rounded border bg-muted" />
        {!apiKey && (
          <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#7c6b62" }}>
            Укажите ключ API 2GIS (NEXT_PUBLIC_2GIS_API_KEY)
          </div>
        )}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 text-xs rounded px-2 py-1" style={{ backgroundColor: "#fff1e6", color: "#7c6b62", border: "1px solid var(--border-warm)" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
