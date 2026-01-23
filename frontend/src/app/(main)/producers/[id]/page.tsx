import { getProducerById, getDishes, getProducerReviews, getProfile, getFullImageUrl, getCategories, type Producer, type Dish, type Review, type Category } from "@/lib/api";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/CartActions";
import ProducerDishes from "@/components/ProducerDishes";

export default async function Page(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const showAllReviews = typeof sp?.reviews === "string" && sp.reviews === "all";
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  let producer: Producer | null = null;
  let isOwner = false;

  try {
    producer = await getProducerById(id);
    if (token) {
      try {
        const profile = await getProfile(token);
        isOwner = profile.role === 'SELLER' && profile.producer_id === id;
      } catch (e) {
        // Not logged in or error getting profile
      }
    }
  } catch {
    producer = null;
  }

  if (!producer || (producer.is_hidden && !isOwner)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl">🏪</div>
        <h1 className="text-2xl font-semibold" style={{ color: "#4b2f23" }}>
          Магазин временно недоступен
        </h1>
        <p className="text-sm max-w-md" style={{ color: "#7c6b62" }}>
          Этот продавец временно закрыл свой магазин или страница была скрыта.
        </p>
        <Link href="/producers" className="px-6 py-2 bg-[#c9825b] text-white rounded-xl font-bold hover:bg-[#b9754f] transition-colors">
          Вернуться к списку продавцов
        </Link>
      </div>
    );
  }

  const rawReviews: Review[] = await getProducerReviews(id).catch(() => []);
  const reviews = [...rawReviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 10);
  const dishes: Dish[] = await getDishes({ producer: id, is_available: "true" }).catch(() => []);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + (r.rating_taste + r.rating_appearance + r.rating_service) / 3, 0) / reviews.length 
    : producer.rating;

  // Get current day's schedule
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[new Date().getDay()];
  const todaySchedule = producer.weekly_schedule?.find(d => d.day === todayKey);
  
  const isOpenNow = () => {
    if (!todaySchedule) return false;
    if (todaySchedule.is_247) return true;
    if (!todaySchedule.intervals || todaySchedule.intervals.length === 0) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return todaySchedule.intervals.some(interval => {
      const [startH, startM] = interval.start.split(':').map(Number);
      const [endH, endM] = interval.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    });
  };

  const status = isOpenNow();

  let categories: Category[] = [];
  try {
    categories = await getCategories({ only_roots: true });
  } catch {
    categories = [];
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[32px] bg-white border border-[#e5e7eb] shadow-sm">
        <div className="h-32 md:h-48 bg-gradient-to-r from-[#fdeedb] to-[#fbe8d2]" />
        <div className="px-6 pb-6 md:px-10 md:pb-10 -mt-12 md:-mt-16 flex flex-col md:flex-row items-start md:items-end gap-6">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-[24px] overflow-hidden border-4 border-white bg-white shadow-md">
            {producer.logo_url ? (
              <img src={getFullImageUrl(producer.logo_url)} alt={producer.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50 text-gray-300">
                {producer.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-4xl font-bold text-[#4b2f23]">{producer.name}</h1>
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {status ? 'Открыто' : 'Закрыто'}
                </span>
                {producer.is_hidden && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                    Скрыт от покупателей
                  </span>
                )}
                {isOwner && (
                  <Link href="/seller?view=PROFILE" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[#c9825b] text-white rounded-full hover:bg-[#b9754f] transition-colors">
                    Редактировать
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#7c6b62]">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 text-lg">★</span>
                <span className="font-bold text-[#4b2f23]">{avgRating.toFixed(1)}</span>
                <span>({reviews.length} отзывов)</span>
              </div>
              <div>•</div>
              <div>
                {producer.address || producer.city}
              </div>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Сегодня</div>
              <div className="text-sm font-medium text-[#4b2f23]">
                {todaySchedule 
                  ? (todaySchedule.is_247 ? 'Круглосуточно' : (todaySchedule.intervals?.[0] ? `${todaySchedule.intervals[0].start} — ${todaySchedule.intervals[0].end}` : 'Выходной'))
                  : (producer.opening_time && producer.closing_time ? `${producer.opening_time} — ${producer.closing_time}` : 'Часы не указаны')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar Info */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#4b2f23]">О продавце</h3>
            <p className="text-sm leading-relaxed text-[#7c6b62] break-words">
              {producer.description || "Описание пока не добавлено."}
            </p>
          </div>

          {producer.delivery_radius_km && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#4b2f23]">Доставка</h3>
              <div className="space-y-2 text-sm text-[#7c6b62]">
                <div className="flex justify-between">
                  <span>Радиус:</span>
                  <span className="font-medium text-[#4b2f23]">{producer.delivery_radius_km} км</span>
                </div>
                {producer.delivery_time_minutes && (
                  <div className="flex justify-between">
                    <span>Время:</span>
                    <span className="font-medium text-[#4b2f23]">~{producer.delivery_time_minutes} мин</span>
                  </div>
                )}
                {producer.delivery_price_to_door && (
                  <div className="flex justify-between">
                    <span>До двери:</span>
                    <span className="font-medium text-[#4b2f23]">{producer.delivery_price_to_door} ₽</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {producer.weekly_schedule && producer.weekly_schedule.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#4b2f23]">График работы</h3>
              <div className="space-y-1.5">
                {producer.weekly_schedule.map((day) => (
                  <div key={day.day} className="flex justify-between text-xs">
                    <span className="capitalize text-[#7c6b62]">
                      {day.day === 'monday' ? 'Пн' : 
                       day.day === 'tuesday' ? 'Вт' : 
                       day.day === 'wednesday' ? 'Ср' : 
                       day.day === 'thursday' ? 'Чт' : 
                       day.day === 'friday' ? 'Пт' : 
                       day.day === 'saturday' ? 'Сб' : 'Вс'}
                    </span>
                    <span className={`font-medium ${day.is_247 || day.intervals.length > 0 ? 'text-[#4b2f23]' : 'text-red-400'}`}>
                      {day.is_247 ? 'Круглосуточно' : 
                       day.intervals.length > 0 ? day.intervals.map(i => `${i.start}-${i.end}`).join(', ') : 'Выходной'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content: Dishes */}
        <div className="lg:col-span-3 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#4b2f23]">Меню</h2>
              <span className="text-sm text-gray-400">{dishes.length} позиций</span>
            </div>

            {dishes.length === 0 ? (
              <div className="bg-[#fcf8f3] border border-dashed border-[#e8ddd2] rounded-3xl p-12 text-center">
                <div className="text-4xl mb-4">🍳</div>
                <h3 className="text-lg font-medium text-[#4b2f23] mb-2">Меню пусто</h3>
                <p className="text-sm text-[#7c6b62]">Продавец еще не добавил блюда в меню или они временно недоступны.</p>
              </div>
            ) : (
              <ProducerDishes dishes={dishes} categories={categories} />
            )}
          </section>

          {/* Reviews Section */}
          <section className="space-y-6 pt-10 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#4b2f23]">Отзывы покупателей</h2>
            </div>

                {reviews.length === 0 ? (
              <div className="bg-[#fcf8f3] border border-dashed border-[#e8ddd2] rounded-3xl p-12 text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-[#4b2f23] mb-2">Пока нет отзывов</h3>
                <p className="text-sm text-[#7c6b62]">Будьте первым, кто поделится своим мнением о блюдах этого продавца!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((r) => {
                  const avg = (r.rating_taste + r.rating_appearance + r.rating_service) / 3;
                  return (
                    <div key={r.id} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-5">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#c9825b] font-bold text-lg">
                            {Math.round(avg)}
                          </div>
                          <div>
                            <div className="text-base font-bold text-gray-900">{r.user || "Покупатель"}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(r.created_at).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className={`w-4 h-4 ${star <= Math.round(avg) ? "text-yellow-400" : "text-gray-200"}`}
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Metrics - Left Column */}
                        <div className="flex flex-col gap-3 min-w-[140px] pt-1">
                          {[
                            { label: "Вкус", value: r.rating_taste },
                            { label: "Внешний вид", value: r.rating_appearance },
                            { label: "Сервис", value: r.rating_service },
                          ].map((item, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                {item.label}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-900">{item.value}/5</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= item.value ? "text-yellow-400 fill-current" : "text-gray-100 fill-current"
                                      }`}
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                    {(r.dish_photo || r.finished_photo || r.photo) && (
                      <div className="flex flex-wrap gap-4 flex-1">
                        {r.dish_photo && (
                          <div className="space-y-2">
                            <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                              <img
                                src={getFullImageUrl(r.dish_photo)}
                                alt="Dish main"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
                              Карточка товара
                            </div>
                          </div>
                        )}
                        {r.finished_photo && (
                          <div className="space-y-2">
                            <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                              <img
                                src={getFullImageUrl(r.finished_photo)}
                                alt="Finished dish"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
                              Готовое блюдо
                            </div>
                          </div>
                        )}
                        {r.photo && (
                          <div className="space-y-2">
                            <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                              <img
                                src={getFullImageUrl(r.photo)}
                                alt="Фото покупателя"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
                              Фото покупателя
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {r.comment && (
                    <div className="relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#c9825b]/10 rounded-full" />
                      <p className="text-gray-800 leading-relaxed font-medium pl-2 italic">
                        «{r.comment}»
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
                {!showAllReviews && reviews.length > visibleReviews.length && (
                  <div className="flex justify-center pt-2">
                    <Link
                      href="?reviews=all"
                      className="group flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#c9825b] text-[#c9825b] rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-[#c9825b] hover:text-white transition-all duration-300 shadow-lg shadow-[#c9825b]/10 hover:shadow-[#c9825b]/20 active:scale-95"
                    >
                      Показать ещё
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="w-4 h-4 group-hover:translate-y-0.5 transition-transform"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
