import { getProducers, type Producer } from "@/lib/api";
import Link from "next/link";

export default async function Page() {
  let producers: Producer[] = [];
  try {
    producers = await getProducers();
  } catch {
    producers = [];
  }
  return (
    <div className="space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6">
      <h1 className="text-2xl font-semibold">Производители</h1>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {producers.map((p) => (
          <li key={p.id} className="bg-gray-800/50 backdrop-blur-sm p-4 space-y-1 rounded-2xl shadow-xl">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-600">{p.city}</div>
            <div className="text-sm">Рейтинг: {p.rating}</div>
            <div>
              <Link href={`/dishes?producer=${p.id}`} className="inline-block bg-accent text-white rounded-full px-4 py-2">
                Смотреть блюда
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
