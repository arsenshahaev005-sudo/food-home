import { getDish, getProducerById, type Dish, type Producer } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import DishDetailPurchaseSection from "@/components/DishDetailPurchaseSection";

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  let dish: Dish | null = null;
  try {
    dish = await getDish(id);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold" style={{ color: "#4b2f23" }}>
          Блюдо недоступно
        </h1>
        <p className="text-sm" style={{ color: "#7c6b62" }}>
          Возможно, его удалили или оно временно недоступно для заказа.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/cart" className="btn-warm">
            Вернуться в корзину
          </Link>
          <Link href="/dishes" className="btn-warm" style={{ backgroundColor: "#c9825b", color: "#ffffff" }}>
            К другим блюдам
          </Link>
        </div>
      </div>
    );
  }

  let producer: Producer | null = null;
  try {
    producer = await getProducerById(dish.producer);
  } catch {
    producer = null;
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: "#4b2f23" }}>
          {dish.name}
        </h1>

        <div className="block">
          {dish.photo && (
            <div
              className="md:float-left md:w-1/2 md:mr-8 md:mb-6 mb-4 relative rounded-2xl overflow-hidden"
              style={{ boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)" }}
            >
              <Image
                src={dish.photo}
                alt={dish.name}
                width={1200}
                height={800}
                className="w-full h-auto"
                style={{ filter: "contrast(1.02) saturate(1.05) sepia(0.06)" }}
              />
              {dish.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 bg-[#C9825B] text-white font-black px-4 py-2 rounded-2xl shadow-xl text-lg">
                  −{dish.discount_percentage}%
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            <p className="text-lg leading-relaxed" style={{ color: "#4b2f23" }}>
              {dish.description}
            </p>

            <DishDetailPurchaseSection dish={dish} token={(await cookies()).get("accessToken")?.value} />

            {dish.composition && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Состав</h4>
                <p className="text-gray-600 leading-relaxed">{dish.composition}</p>
              </div>
            )}
          </div>
          <div className="clear-both"></div>
        </div>
      </div>

      <aside className="space-y-4">
        <h2 className="text-xl font-semibold">Производитель</h2>
        {producer ? (
          <div
            className="p-4 space-y-3"
            style={{ backgroundColor: "#fcf8f3", borderRadius: "20px", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)" }}
          >
            <div className="space-y-1">
              <div className="font-medium">{producer.name}</div>
              <div className="text-sm" style={{ color: "#7c6b62" }}>
                {producer.city}
              </div>
              <div className="text-sm">Рейтинг: {producer.rating}</div>
            </div>
            <p className="text-sm">{producer.description}</p>
            <Link
              href={`/producers/${producer.id}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-[#c9825b] text-white hover:bg-[#b07350] transition-colors"
            >
              Страница продавца
            </Link>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "#7c6b62" }}>
            Информация о производителе недоступна
          </div>
        )}
      </aside>
    </div>
  );
}
