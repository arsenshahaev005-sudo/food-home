"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/api";

export default function CartMenu({ token }: { token?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!token) return;
        const cart = await getCart(token);
        const c = cart.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0;
        if (active) setCount(c);
      } catch {}
    }
    load();
    const onCartChanged = () => void load();
    window.addEventListener("cart_changed", onCartChanged);
    return () => {
      active = false;
      window.removeEventListener("cart_changed", onCartChanged);
    };
  }, [token]);

  return (
    <div className="relative">
      <Link
        href="/cart"
        className="btn-warm relative flex items-center justify-center"
        style={{ width: 44, height: 44, padding: 0 }}
        aria-label="Перейти в корзину"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {count > 0 && (
          <span
            className="pointer-events-none absolute -top-1 -right-1 text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            style={{ backgroundColor: "#c9825b", color: "white", boxShadow: "var(--shadow-soft)", border: "2px solid #fff" }}
          >
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
