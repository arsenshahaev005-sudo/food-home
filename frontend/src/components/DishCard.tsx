"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import FitTitle from "@/components/FitTitle";
import { AddToCartButton } from "@/components/CartActions";
import { BASE_URL, type Dish } from "@/lib/api";
import { toggleFavorite } from "@/lib/api/favorites";
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return "";
}

const StarRow = ({ rating = "4.96", count = "7 тыс." }: { rating?: string; count?: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" style={{ color: "#4b2f23" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f4a259" aria-hidden="true">
          <path d="M12 .587l3.668 7.431 8.207 1.193-5.938 5.79 1.403 8.18L12 18.896l-7.34 3.985 1.403-8.18L.125 9.211l8.207-1.193z" />
        </svg>
        <span className="text-sm" style={{ color: "#c9825b" }}>
          {rating}
        </span>
      </div>
      <span className="text-xs" style={{ color: "#7c6b62" }}>
        {count}
      </span>
    </div>
  );
};

function computeDiscountedPrice(dish: Dish) {
  const base = Number(dish.price);
  if (!Number.isFinite(base)) return null;
  if (dish.discount_percentage > 0) return Math.round(base * (1 - dish.discount_percentage / 100));
  return Math.round(base);
}

function normalizeImageSrc(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE_URL}${src}`;
  return `${BASE_URL}/${src}`;
}

export function DishCard({
  dish,
  onOpen,
  heightClassName = "h-[var(--dish-card-h)]",
  forceBuyButton = false,
}: {
  dish: Dish;
  onOpen?: (dish: Dish) => void;
  heightClassName?: string;
  forceBuyButton?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(dish.is_favorite || false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const discountedPrice = computeDiscountedPrice(dish);
  const canOpen = Boolean(onOpen);
  const photoSrc = useMemo(() => normalizeImageSrc(dish.photo), [dish.photo]);
  const [isPhotoBroken, setIsPhotoBroken] = useState(false);
  const isSoon = !dish.is_available || Boolean(dish.start_sales_at);
  const hasToppings = dish.toppings && dish.toppings.length > 0;
  const showSelectButton = hasToppings && !forceBuyButton;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    const token = getCookie("accessToken");
    if (!token) {
      alert("Для добавления в избранное необходимо авторизоваться");
      return;
    }
    
    try {
      setIsLoadingFavorite(true);
      await toggleFavorite(dish.id, token);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Ошибка при изменении статуса избранного");
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Открыть ${dish.name}`}
      className={[
        "relative overflow-hidden",
        "bg-[#fff9f3]",
        "rounded-[24px]",
        "border",
        canOpen ? "cursor-pointer" : "cursor-default",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9825b]/30",
        "transition-[box-shadow] duration-200",
        "hover:shadow-[0_8px_28px_rgba(185,135,90,0.28),0_2px_8px_rgba(75,47,35,0.06)]",
        heightClassName,
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-soft)", borderColor: "var(--border-warm)" }}
      onClick={() => canOpen && onOpen && onOpen(dish)}
      onKeyDown={(e) => {
        if (!canOpen || !onOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(dish);
        }
      }}
    >
      <div className="relative w-full h-48">
        {photoSrc && !isPhotoBroken ? (
          <img
            src={photoSrc}
            alt={dish.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "contrast(1.02) saturate(1.05) sepia(0.06)" }}
            onError={() => setIsPhotoBroken(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
        )}

        {dish.discount_percentage > 0 ? (
          <span className="absolute top-2 left-2 text-xs font-black rounded-xl px-2.5 py-1.5 shadow-lg" style={{ backgroundColor: "#C9825B", color: "#ffffff" }}>
            −{dish.discount_percentage}%
          </span>
        ) : null}

        {isSoon ? (
          <span className="absolute top-2 right-2 text-xs font-black rounded-xl px-2.5 py-1.5 shadow-lg" style={{ backgroundColor: "#4b2f23", color: "#ffffff" }}>
            Скоро
          </span>
        ) : null}
        
        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-md"
          aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
        >
          {isLoadingFavorite ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isFavorite ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          )}
        </button>
      </div>

      <div className="p-4 grid gap-2" style={{ gridTemplateRows: "minmax(0,1fr) auto 40px" }}>
        <FitTitle text={dish.name} className="font-medium title-clamp" style={{ color: "#4b2f23" }} />
        <div className="flex items-center justify-between gap-2">
          <StarRow rating={dish.rating?.toFixed(1) || "4.96"} count={`${dish.review_count || 7} тыс.`} />
        </div>

        <div
          className="buy-btn card-buy-fixed"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {showSelectButton ? (
            <button
              className="btn-warm btn-toggle w-full h-full flex items-center justify-center gap-2"
              onClick={() => canOpen && onOpen && onOpen(dish)}
            >
              <span className="btn-price">{discountedPrice !== null ? `${discountedPrice} ₽` : ""}</span>
              <span className="btn-buy">Выбрать</span>
            </button>
          ) : (
            <AddToCartButton
              dish={dish.id}
              labelPrice={discountedPrice !== null ? String(discountedPrice) : undefined}
              minQuantity={dish.min_quantity || 1}
              maxQuantityPerOrder={dish.max_quantity_per_order || null}
              variant="compact"
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function DishCardPlaceholder({
  name,
  price,
  badge,
  heightClassName = "h-[var(--dish-card-h)]",
}: {
  name: string;
  price: string;
  badge?: string;
  heightClassName?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden",
        "bg-[#fff9f3]",
        "rounded-[24px]",
        "border",
        heightClassName,
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-soft)", borderColor: "var(--border-warm)" }}
    >
      <div className="relative w-full h-48">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
        {badge ? (
          <span className="absolute top-2 left-2 text-xs font-black rounded-xl px-2.5 py-1.5 shadow-lg" style={{ backgroundColor: "#c9825b", color: "#ffffff" }}>
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-4 grid gap-2" style={{ gridTemplateRows: "minmax(0,1fr) auto 40px" }}>
        <FitTitle text={name} className="font-medium title-clamp" style={{ color: "#4b2f23" }} />
        <StarRow />
        <div className="buy-btn card-buy-fixed">
          <button className="btn-warm btn-toggle" disabled>
            <span className="btn-price">{price}</span>
            <span className="btn-buy">Купить</span>
          </button>
        </div>
      </div>
    </div>
  );
}
