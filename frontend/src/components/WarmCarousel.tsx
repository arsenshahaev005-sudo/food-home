"use client";

import { useRef } from "react";
import Image from "next/image";
import { AddToCartButton } from "@/components/CartActions";
import type { UUID } from "@/lib/api";

type Item = { id?: UUID; name: string; price: string | number; photo?: string; placeholder?: boolean; min_quantity?: number };

export default function WarmCarousel({ items, token }: { items: Item[]; token?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  function scrollBy(delta: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }
  const step = 320;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-6 overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: "x mandatory", paddingBottom: "0.5rem" }}
      >
        {items.map((it, idx) => (
          <div
            key={(it.id ?? idx) as string}
            className="min-w-[260px] p-4 space-y-3"
            style={{ backgroundColor: "#fff9f3", borderRadius: "24px", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)", scrollSnapAlign: "start" }}
          >
            {it.photo ? (
              <div className="relative w-full h-32">
                <Image src={it.photo} alt={it.name} fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover rounded-2xl" style={{ filter: "contrast(1.02) saturate(1.05) sepia(0.06)" }} />
              </div>
            ) : (
              <div className="w-full h-32 rounded-2xl" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)", boxShadow: "var(--shadow-soft)" }} />
            )}
            <div className="font-medium truncate" style={{ color: "#4b2f23" }}>{it.name}</div>
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: "#4b2f23" }}>{it.price}</div>
              <div className="flex gap-2">
                {it.id ? (
                  <AddToCartButton dish={it.id} token={token} minQuantity={it.min_quantity} />
                ) : (
                  <button className="text-white rounded-full px-3 py-1 text-sm" style={{ backgroundColor: "#c9825b", boxShadow: "var(--shadow-soft)" }} disabled>
                    В корзину
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 flex items-center">
        <button onClick={() => scrollBy(-step)} className="rounded-full p-2" style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", color: "#4b2f23" }}>
          ◀
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button onClick={() => scrollBy(step)} className="rounded-full p-2" style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", color: "#4b2f23" }}>
          ▶
        </button>
      </div>
    </div>
  );
}
