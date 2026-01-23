import { getCategories, type Category } from "@/lib/api";

export default async function Page() {
  let categories: Category[] = [];
  try {
    categories = await getCategories({ only_roots: true });
  } catch {
    categories = [];
  }
  return (
    <div className="space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6">
      <h1 className="text-2xl font-semibold">Категории</h1>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {categories.map((c) => (
          <li key={c.id}>
            <div
              className="flex flex-col items-center justify-center gap-2 aspect-square text-center"
              style={{ backgroundColor: "#fcf8f3", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)", borderRadius: "20px" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4B2F23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <div className="font-medium" style={{ color: "#4b2f23" }}>{c.name}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
