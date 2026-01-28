import { getCategories, getProducers, getDishes } from "@/lib/api";
import PageWrapper from "./page-wrapper";

export default async function Page(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const sp = await props.searchParams;
  const search = typeof sp?.search === "string" ? sp.search : undefined;
  const category = typeof sp?.category === "string" ? sp.category : undefined;
  const producer = typeof sp?.producer === "string" ? sp.producer : undefined;
  const section = typeof sp?.section === "string" ? sp.section : "all";
  // Note: collection parameter is extracted but not used in API call yet
  // as backend doesn't support collection filtering
  const collection = typeof sp?.collection === "string" ? sp.collection : undefined;

  const [categories, producers, dishes] = await Promise.all([
    getCategories(),
    getProducers(),
    getDishes({ search, category, producer }),
  ]).catch((error) => {
    console.error('[Dishes Page] Error loading data:', error);
    return [[], [], []] as [any, any, any];
  });

  const initialFilters = {
    search,
    category,
    producer,
    section,
    collection
  };

  const initialData = {
    categories: categories || [],
    producers: Array.isArray(producers) ? producers : [],
    // getDishes returns { results: Dish[], count: number }
    dishes: dishes && Array.isArray(dishes.results) ? dishes.results : (Array.isArray(dishes) ? dishes : [])
  };

  return <PageWrapper initialData={initialData} initialFilters={initialFilters} />;
}
