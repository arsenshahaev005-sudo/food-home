import { cookies } from "next/headers";
import Link from "next/link";
import { BASE_URL, getCart, getProfile, type Cart, type Dish, type Profile } from "@/lib/api";
import { CartItemControls, CartItemSelectToggle, CartTotals, ClearCartButton } from "@/components/CartActions";
import { CheckoutModal } from "@/components/CheckoutForm";
import { CartDishQuickView } from "@/components/CartDishQuickView";

// Disable caching for this page to always show fresh cart
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function Page() {
  const token = (await cookies()).get("accessToken")?.value;
  let cart: Cart | null = null;
  let profile: Profile | null = null;
  try {
    if (token) {
      const [c, p] = await Promise.all([getCart(token), getProfile(token)]);
      cart = c;
      profile = p;
    }
  } catch {
    cart = null;
  }

  let itemsWithDish: Array<{ id: string; dish: Dish; quantity: number; price: number; selected_toppings: any[] }> = [];
  if (cart?.items?.length) {
    itemsWithDish = cart.items.map((i) => ({
      id: i.id,
      dish: i.dish,
      quantity: i.quantity,
      price: Number(i.price_at_the_moment),
      selected_toppings: i.selected_toppings || [],
    }));
  }

  const cartItems = (cart?.items || []).map((it) => ({
    dish: it.dish.id,
    quantity: it.quantity,
    selected_toppings: it.selected_toppings,
  }));
  const cartItemsWithPrice = itemsWithDish.map((it) => ({
    dish: it.dish.id,
    quantity: it.quantity,
    price: it.price,
    selected_toppings: it.selected_toppings,
  }));

  // Calculate total cooking time
  const totalCookingTime = itemsWithDish.reduce((sum, item) => {
    return sum + (item.dish.cooking_time_minutes || 0) * item.quantity;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">Корзина</h1>
          <div className="text-sm mt-2" style={{ color: "#7c6b62" }}>
            {token ? (itemsWithDish.length ? `${itemsWithDish.length} поз.` : "Пока пусто") : "Нужна авторизация"}
          </div>
        </div>
        {token && itemsWithDish.length > 0 ? (
          <div className="flex items-center gap-3">
            <Link href="/orders" className="btn-warm bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200">
              Мои заказы
            </Link>
            <Link href="/dishes" className="btn-warm">
              Продолжить покупки
            </Link>
            <ClearCartButton token={token} />
          </div>
        ) : null}
      </div>

      {!token && (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl space-y-4">
          <div className="text-lg font-bold" style={{ color: "#4b2f23" }}>
            Чтобы оформить заказ, войдите в аккаунт
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/auth/login" className="btn-warm" style={{ backgroundColor: "#c9825b", color: "#ffffff" }}>
              Войти
            </Link>
            <Link href="/dishes" className="btn-warm">
              Посмотреть блюда
            </Link>
          </div>
        </div>
      )}

      {token && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className={itemsWithDish.length > 0 ? "lg:col-span-2 space-y-4" : "hidden"}>
            <ul className="space-y-4">
              {itemsWithDish.map((it) => {
                const primaryPhoto = it.dish.photo || it.dish.images?.[0]?.image || "";
                const src = normalizeImageSrc(primaryPhoto);
                const lineTotal = it.price * it.quantity;
                const minQuantity = it.dish.min_quantity || 1;
                const maxQuantity = it.dish.max_quantity_per_order;
                return (
                  <li key={it.id} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <CartItemSelectToggle dish={it.dish.id} selectedToppings={it.selected_toppings} />
                        <CartDishQuickView dish={it.dish}>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white border border-gray-100 shrink-0">
                              {src ? (
                                <img src={src} alt={it.dish.name} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#fdeedb,#fbe8d2)" }} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="block font-black text-gray-900 text-lg group-hover:text-[#c9825b] transition-colors truncate">
                                {it.dish.name}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-sm" style={{ color: "#7c6b62" }}>
                                  {formatRUB(it.price)} ₽ / шт.
                                </span>
                                {it.selected_toppings?.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {it.selected_toppings.map((t: any, idx: number) => (
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
                          dish={it.dish.id} 
                          token={token} 
                          quantity={it.quantity} 
                          minQuantity={minQuantity} 
                          maxQuantity={maxQuantity} 
                          items={cartItems}
                          selectedToppings={it.selected_toppings}
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
                  <Link href="/orders" className="btn-warm bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200">
                    Мои заказы
                  </Link>
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

          <aside className={itemsWithDish.length > 0 ? "space-y-4 lg:sticky lg:top-8" : "hidden"}>
            <CartTotals items={cartItemsWithPrice} />
            {/* Display Total Cooking Time */}
            {totalCookingTime > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Общее время приготовления</div>
                    <div className="text-lg font-bold text-gray-900">
                      {Math.floor(totalCookingTime / 60)}ч {totalCookingTime % 60}м
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Время может варьироваться в зависимости от загруженности кухни
                </div>
              </div>
            )}
            <div className="bg-card rounded-[32px] p-6 space-y-4">
              <CheckoutModal
                token={token}
                defaultCity={profile?.city}
                items={itemsWithDish.map((it) => ({
                  id: it.id,
                  dish: it.dish.id,
                  quantity: it.quantity,
                  price: it.price,
                  selected_toppings: it.selected_toppings,
                }))}
              />
            </div>
          </aside>

          {/* This ensures CheckoutModal stays mounted even when cart is empty */}
          {itemsWithDish.length === 0 && (
            <div className="hidden">
              <CheckoutModal token={token} items={[]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
