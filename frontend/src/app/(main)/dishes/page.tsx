import { getCategories, getProducers, getDishes, type Dish } from "@/lib/api";
import PageWrapper from "./page-wrapper";

export default async function Page(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const sp = await props.searchParams;
  const search = typeof sp?.search === "string" ? sp.search : undefined;
  const category = typeof sp?.category === "string" ? sp.category : undefined;
  const producer = typeof sp?.producer === "string" ? sp.producer : undefined;
  const section = typeof sp?.section === "string" ? sp.section : "all";

  const [categories, producers, dishes] = await Promise.all([
    getCategories({ only_roots: true }),
    getProducers(),
    getDishes({ search, category, producer }),
  ]).catch((error) => {
    console.error('[Dishes Page] Error loading data:', error);
    return [[], [], []];
  });

  const initialFilters = {
    search,
    category,
    producer,
    section
  };

  const initialData = {
    categories,
    producers,
    dishes
  };

  return <PageWrapper initialData={initialData} initialFilters={initialFilters} />;
}
