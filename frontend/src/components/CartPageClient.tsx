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

    async function loadCartData() {
      try {
        setLoading(true);
        setError(null);

        const token = readCookie("accessToken");

        if (!token) {
          if (active) {
            setCart(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const [c, p] = await Promise.all([getCart(token), getProfile(token)]);

        if (active) {
          setCart(c);
          setProfile(p);
          setLoading(false);
        }
      } catch (err) {
        console.error('[CartPageClient] Failed to load cart:', err);
        if (active) {
          setError("Не удалось загрузить корзину");
          setCart(null);
          setLoading(false);
        }
      }
    }

    loadCartData();

    const onCartChanged = () => void loadCartData();
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#4b2f23" }}>
            Корзина
          </h1>
          {token && <ClearCartButton token={token} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {itemsWithDish.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-6 shadow-soft flex gap-6"
              >
                <CartItemSelectToggle
                  dishId={item.dish.id}
                  selectedToppings={item.selected_toppings}
                />

                <div className="relative w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden">
                  <img
                    src={normalizeImageSrc(item.dish.photo)}
                    alt={item.dish.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: "#4b2f23" }}>
                      {item.dish.name}
                    </h3>
                    <CartDishQuickView dish={item.dish}>
                      <button className="text-gray-400 hover:text-[#c9825b] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </CartDishQuickView>
                  </div>

                  {item.selected_toppings && item.selected_toppings.length > 0 && (
                    <p className="text-sm text-gray-600 mb-3">
                      Добавки: {item.selected_toppings.map((t: any) => t.name).join(", ")}
                    </p>
                  )}

                  <div className="flex justify-between items-center">
                    <CartItemControls
                      dish={item.dish.id}
                      initialQuantity={item.quantity}
                      selectedToppings={item.selected_toppings}
                      token={token}
                    />
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: "#c9825b" }}>
                        {formatRUB(item.price * item.quantity)} ₽
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-soft sticky top-4">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#4b2f23" }}>
                Итого
              </h2>
              <CartTotals items={itemsWithDish} />
              {token && (
                <CheckoutModal
                  items={itemsWithDish.map((it) => ({
                    id: it.id,
                    dish: it.dish.id,
                    quantity: it.quantity,
                    price: it.price,
                    selected_toppings: it.selected_toppings,
                  }))}
                  token={token}
                  defaultCity={profile?.city}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
