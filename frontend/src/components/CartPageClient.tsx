"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL, getCart, getProfile, type Cart, type Profile } from "@/lib/api";
import { CartItemControls, CartItemSelectToggle, CartTotals, ClearCartButton } from "@/components/CartActions";
import { CheckoutModal } from "@/components/CheckoutForm";
import { CartDishQuickView } from "@/components/CartDishQuickView";

function normalizeImageSrc(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE_URL}${src}`;
  return `${BASE_URL}/${src}`;
}

function formatRUB(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

export default function CartPageClient() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCartData(withSpinner: boolean = false) {
      try {
        if (withSpinner) {
          setLoading(true);
        }
        setError(null);

        const token = readCookie("accessToken");

        if (!token) {
          if (active) {
            setCart(null);
            setProfile(null);
            if (withSpinner) {
              setLoading(false);
            }
          }
          return;
        }

        const [c, p] = await Promise.all([getCart(token), getProfile(token)]);

        if (active) {
          setCart(c);
          setProfile(p);
          if (withSpinner) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[CartPageClient] Failed to load cart:', err);
        if (active) {
          setError("Не удалось загрузить корзину");
          setCart(null);
          if (withSpinner) {
            setLoading(false);
          }
        }
      }
    }

    loadCartData(true);

    const onCartChanged = () => void loadCartData(false);
    window.addEventListener("cart_changed", onCartChanged);

    return () => {
      active = false;
      window.removeEventListener("cart_changed", onCartChanged);
    };
  }, []);

  let itemsWithDish: Array<{ id: string; dish: any; quantity: number; price: number; selected_toppings: any[] }> = [];

  if (cart?.items?.length) {
    itemsWithDish = cart.items.map((i) => ({
      id: i.id,
      dish: i.dish,
      quantity: i.quantity,
      price: parseFloat(i.price_at_the_moment),
      selected_toppings: i.selected_toppings || [],
    }));
  }

  const token = readCookie("accessToken");

  // Prepare cart items for CartItemControls (needs dish IDs)
  const cartItems = itemsWithDish.map((it) => ({
    dish: it.dish.id,
    quantity: it.quantity,
    selected_toppings: it.selected_toppings,
  }));

  // Prepare items for CartTotals (needs dish IDs with prices)
  const cartItemsWithPrice = itemsWithDish.map((it) => ({
    dish: it.dish.id,
    quantity: it.quantity,
    price: it.price,
    selected_toppings: it.selected_toppings,
  }));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9825b] mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка корзины...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-8 text-center shadow-soft">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#4b2f23" }}>
              Войдите в аккаунт
            </h2>
            <p className="text-gray-600 mb-6">
              Чтобы увидеть корзину, необходимо войти в систему
            </p>
            <Link
              href="/auth/login"
              className="btn-warm inline-block"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 rounded-3xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-warm"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!itemsWithDish.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-8 text-center shadow-soft">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#4b2f23" }}>
              Корзина пуста
            </h2>
            <p className="text-gray-600 mb-6">
              Добавьте блюда в корзину на главной или в каталоге.
            </p>
            <Link
              href="/"
              className="btn-warm inline-block"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-32">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">Корзина</h1>
          <div className="text-sm mt-2" style={{ color: "#7c6b62" }}>
            {itemsWithDish.length ? `${itemsWithDish.length} поз.` : "Пока пусто"}
          </div>
        </div>
        {token && itemsWithDish.length > 0 && (
          <div className="flex items-center gap-3">
            <Link href="/dishes" className="btn-warm">
              Продолжить покупки
            </Link>
            <ClearCartButton token={token} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={itemsWithDish.length > 0 ? "lg:col-span-2 space-y-4" : "hidden"}>
          <ul className="space-y-4">
            {itemsWithDish.map((item) => {
              const primaryPhoto = item.dish.photo || item.dish.images?.[0]?.image || "";
              const src = normalizeImageSrc(primaryPhoto);
              const lineTotal = item.price * item.quantity;

              return (
                <li key={item.id} className="bg-white rounded-2xl shadow-xl p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <CartItemSelectToggle dish={item.dish.id} selectedToppings={item.selected_toppings} />
                      <CartDishQuickView dish={item.dish}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white border border-gray-100 shrink-0">
                            {src ? (
                              <img src={src} alt={item.dish.name} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="block font-black text-gray-900 text-lg group-hover:text-[#c9825b] transition-colors truncate">
                              {item.dish.name}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-sm" style={{ color: "#7c6b62" }}>
                                {formatRUB(item.price)} ₽ / шт.
                              </span>
                              {item.selected_toppings?.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.selected_toppings.map((t: any, idx: number) => (
                                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#fdf2e9] text-[#c9825b] font-bold">
                                      + {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right min-w-[120px] shrink-0">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Сумма</div>
                          <div className="text-2xl font-black text-gray-900">{formatRUB(lineTotal)} ₽</div>
                        </div>
                      </CartDishQuickView>
                    </div>

                    <div className="flex items-center justify-end gap-4 flex-wrap">
                      <CartItemControls
                        dish={item.dish.id}
                        token={token}
                        quantity={item.quantity}
                        minQuantity={item.dish.min_quantity || 1}
                        maxQuantity={item.dish.max_quantity_per_order}
                        items={cartItems}
                        selectedToppings={item.selected_toppings}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {itemsWithDish.length === 0 && (
          <div className="lg:col-span-3">
            <div className="bg-white backdrop-blur-sm p-10 rounded-2xl shadow-xl text-center space-y-4">
              <div className="text-2xl font-black text-gray-900">Корзина пуста</div>
              <div className="text-sm" style={{ color: "#7c6b62" }}>
                Добавьте блюда в корзину на главной или в каталоге.
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/" className="btn-warm">
                  На главную
                </Link>
                <Link href="/dishes" className="btn-warm" style={{ backgroundColor: "#c9825b", color: "#ffffff" }}>
                  Перейти к блюдам
                </Link>
              </div>
            </div>
          </div>
        )}

        <aside className={itemsWithDish.length > 0 ? "space-y-4 lg:sticky lg:top-24" : "hidden"}>
          <CartTotals items={cartItemsWithPrice} />
          <div className="bg-card rounded-[32px] p-6 space-y-4">
            <CheckoutModal
              token={token}
              defaultCity={profile?.city}
              items={cartItemsWithPrice.map((it) => ({
                id: it.dish,
                dish: it.dish,
                quantity: it.quantity,
                price: it.price,
                selected_toppings: it.selected_toppings,
              }))}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
