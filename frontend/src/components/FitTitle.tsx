"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

export default function FitTitle({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    let fontPx = parseFloat(cs.fontSize) || 15;
    const linePx = parseFloat(cs.lineHeight) || fontPx * 1.25;
    const maxH = Math.ceil(linePx * 2);
    let i = 0;
    while (el.scrollHeight > maxH && i < 24 && fontPx > 12) {
      fontPx -= 1;
      el.style.fontSize = fontPx + "px";
      i++;
    }
  }, [text]);
  return (
    <div ref={ref} className={className} style={style}>{text}</div>
  );
}
