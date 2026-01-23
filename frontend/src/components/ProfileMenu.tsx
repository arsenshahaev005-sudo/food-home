"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ProfileMenu({ token }: { token?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  if (token) {
    return (
      <div ref={ref} className="relative">
        <button onClick={() => setOpen((v) => !v)} className="btn-warm" style={{ width: 44, height: 44 }} aria-haspopup="menu" aria-expanded={open}>
          <svg width="20" height="20" viewBox="2 2 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        <div
          className="absolute right-0 mt-2 w-64 p-3 space-y-2"
          style={{
            backgroundColor: "#fcf8f3",
            borderRadius: 16,
            boxShadow: "var(--shadow-soft)",
            border: "1px solid var(--border-warm)",
            transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
            opacity: open ? 1 : 0,
            transition: "transform 180ms ease, opacity 180ms ease",
            pointerEvents: open ? "auto" : "none",
            zIndex: 50
          }}
          role="menu"
        >
          <Link href="/profile" className="btn-warm w-full" style={{ justifyContent: "flex-start", height: 36 }}>Профиль</Link>
          <Link href="/chat" className="btn-warm w-full" style={{ justifyContent: "flex-start", height: 36 }}>Сообщения</Link>
          <Link href="/orders" className="btn-warm w-full" style={{ justifyContent: "flex-start", height: 36 }}>Мои заказы</Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-warm" style={{ width: 44, height: 44 }} aria-haspopup="menu" aria-expanded={open}>
        <svg width="20" height="20" viewBox="2 2 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      <div
        className="absolute right-0 mt-2 w-64 p-3 space-y-2"
        style={{
          backgroundColor: "#fcf8f3",
          borderRadius: 16,
          boxShadow: "var(--shadow-soft)",
          border: "1px solid var(--border-warm)",
          transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
          opacity: open ? 1 : 0,
          transition: "transform 180ms ease, opacity 180ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
        role="menu"
      >
        <Link href="/auth/login" className="btn-warm w-full" style={{ justifyContent: "flex-start", height: 36 }}>Войти</Link>
        <Link href="/auth/register" className="btn-warm w-full" style={{ justifyContent: "flex-start", height: 36 }}>Регистрация</Link>
      </div>
    </div>
  );
}
