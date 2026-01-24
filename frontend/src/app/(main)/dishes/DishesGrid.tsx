"use client";

import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import DishQuickViewModal from "@/components/DishQuickViewModal";
import { DishCard } from "@/components/DishCard";
import type { Dish } from "@/lib/api";

export default function DishesGrid({ dishes }: { dishes: Dish[] }) {
  const [selected, setSelected] = useState<Dish | null>(null);
  const [open, setOpen] = useState(false);

  const openDish = useCallback((dish: Dish) => {
    setSelected(dish);
    setOpen(true);
  }, []);

  const closeDish = useCallback(() => setOpen(false), []);

  return (
    <>
      <DishQuickViewModal
        isOpen={open}
        dishId={selected?.id ?? null}
        initialDish={selected}
        onClose={closeDish}
      />
      <ul
        className="grid grid-cols-2 md:grid-cols-4 gap-5"
        style={{ ["--dish-card-h"]: "320px" } as CSSProperties}
      >
        {dishes.map((d) => (
          <li key={d.id}>
            <DishCard dish={d} onOpen={openDish} />
          </li>
        ))}
      </ul>
    </>
  );
}

