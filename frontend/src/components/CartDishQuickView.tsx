"use client";

import { useState, type ReactNode } from "react";
import type { Dish } from "@/lib/api";
import DishQuickViewModal from "@/components/DishQuickViewModal";

export function CartDishQuickView({ dish, children }: { dish: Dish; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between gap-4 flex-1 min-w-0 group text-left"
      >
        {children}
      </button>
      <DishQuickViewModal isOpen={open} dishId={dish.id} initialDish={dish} onClose={() => setOpen(false)} />
    </>
  );
}

