import { getDishes, getCategories, type Dish, type Category } from "@/lib/api";
import HomeCardsSection from "@/components/HomeCardsSection";
import HomeCollections from "@/components/HomeCollections";
import HeroSection from "@/components/home/HeroSection";
import ReviewsSection from "@/components/home/ReviewsSection";

// Disable caching for this page to always show fresh dishes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  let dishes: Dish[] = [];
  let categories: Category[] = [];
  try {
    const res = await Promise.all([
      getDishes({ is_archived: false, is_available: true }),
      getCategories({ only_roots: true }),
    ]);
    // getDishes returns { results: Dish[], count: number }
    dishes = res[0] && Array.isArray(res[0].results) ? res[0].results : (Array.isArray(res[0]) ? res[0] : []);
    categories = Array.isArray(res[1]) ? res[1] : [];
  } catch (error) {
    console.error('[Home Page] Failed to load data:', error);
    dishes = [];
    categories = [];
  }
  const isSoon = (d: Dish) => !d.is_available || Boolean(d.start_sales_at);
  const soonDishes = Array.isArray(dishes) ? dishes.filter((d) => isSoon(d)) : [];
  const discountedDishes = Array.isArray(dishes) ? dishes.filter((d) => d.is_available && d.discount_percentage > 0 && !isSoon(d)) : [];
  const recommended: Dish[] = Array.isArray(dishes) ? dishes.filter((d) => d.is_available && d.discount_percentage <= 0 && !isSoon(d)).slice(0, 7) : [];
  const heroPhoto = recommended[0]?.photo || discountedDishes[0]?.photo || soonDishes[0]?.photo;
  const heroLocal = "/hero-user.jpg";
  const heroPrimary = heroPhoto || heroLocal;
  const recPlaceholderTop = [
    { name: "Домашниуцуафывыфывфаывфафывафывафывафываывафываыфваывфай суп", price: "$12" },
    { name: "Киш", price: "$10" },
    { name: "Голубцы", price: "$14" },
    { name: "Тирамису", price: "$9" },
  ];
  const recPlaceholderMore = [
    { name: "Плов", price: "$13" },
    { name: "Шарлотка", price: "$8" },
    { name: "Борщ", price: "$11" },
    { name: "Пельмени", price: "$12" },
    { name: "Манты", price: "$12" },
    { name: "Круассаны", price: "$7" },
  ];
  const promosPlaceholder = [
    { name: "Паста Болоньезе", price: "$11", badge: "−20%" },
    { name: "Чизкейк", price: "$7", badge: "−15%" },
    { name: "Окрошка", price: "$9", badge: "−10%" },
    { name: "Стейк куриный", price: "$10", badge: "−25%" },
    { name: "Лимонад", price: "$4", badge: "−30%" },
    { name: "Салат Цезарь", price: "$8", badge: "−20%" },
  ];
  const catPlaceholder = [
    "Выпечка",
    "Горячие блюда",
    "Завтраки",
    "Закуски и салаты",
    "Напитки",
    "Замороженные продукты",
    "Консервация и заготовки",
    "Подарочные наборы",
    "Уют и дом",
    "Красота и уход",
    "Одежда и аксессуары",
    "Хобби и творчество",
    "Для домашних животных",
    "Детское меню",
    "Веган и ПП",
  ];
  const subcatsPlaceholder: Record<string, string[]> = {
    "Выпечка": ["Хлеб и багеты", "Булочки и круассаны", "Пироги и киши", "Торты на заказ", "Десерты и пирожные", "Печенье и пряники", "Кексы и маффины", "Блины и оладьи", "Сырники", "Пахлава и восточные сладости"],
    "Горячие блюда": ["Супы и бульоны", "Мясные блюда", "Рыбные блюда", "Птица", "Плов и блюда из риса", "Паста и лапша", "Котлеты и тефтели", "Запеканки", "Вегетарианские горячие блюда"],
    "Завтраки": ["Каши и боулы", "Яичница и омлеты", "Сэндвичи и тосты", "Гранола и мюсли", "Творожные завтраки"],
    "Закуски и салаты": ["Овощные салаты", "Мясные салаты", "Холодные закуски", "Горячие закуски", "Паштеты и риеты", "Бутерброды и тапас", "Соусы и дипы"],
    "Напитки": ["Соки и морсы", "Домашние лимонады", "Квас и комбуча", "Компоты и кисели", "Травяной чай", "Кофе и какао"],
    "Замороженные продукты": ["Пельмени", "Вареники", "Хинкали и манты", "Чебуреки и самса", "Голубцы и фаршированные перцы", "Котлеты и наггетсы (заморозка)", "Блины с начинкой (заморозка)", "Тесто домашнее"],
    "Консервация и заготовки": ["Варенье и джемы", "Мед и продукты пчеловодства", "Соленья и маринады", "Вяленые томаты и овощи", "Домашние соусы и аджика", "Масло и заправки", "Сухофрукты и орехи"],
    "Подарочные наборы": ["Сладкие боксы", "Гастрономические корзины", "Наборы для чаепития", "Тематические наборы (праздники)", "Наборы специй"],
    "Уют и дом": ["Пледы и подушки", "Ночники и светильники", "Свечи и ароматы", "Декор", "Посуда ручной работы", "Вязаные изделия", "Картины и постеры", "Ароматические саше", "Интерьерные куклы"],
    "Красота и уход": ["Натуральное мыло", "Бомбочки для ванны", "Масла для тела", "Скрабы ручной работы", "Твердые шампуни", "Соль для ванны", "Подарочные наборы"],
    "Одежда и аксессуары": ["Вязаные шапки и шарфы", "Сумки и шоперы", "Бижутерия и украшения", "Кожаные аксессуары", "Одежда из льна", "Броши и значки"],
    "Хобби и творчество": ["Наборы для рукоделия", "Картины по номерам", "Материалы для творчества", "Авторские открытки", "Заготовки для росписи"],
    "Для домашних животных": ["Натуральные лакомства", "Лежанки и домики", "Игрушки ручной работы", "Одежда для питомцев", "Аксессуары"],
    "Детское меню": ["Детские супчики", "Мини-котлетки", "Фигурная выпечка", "Полезные перекусы", "Пюре и кашки"],
    "Веган и ПП": ["Полезные сладости", "Безглютеновая выпечка", "Веганские блюда", "Растительное молоко", "Смузи-боксы"],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-12">
      {/* Hero Section - Improved with clear value proposition */}
      <HeroSection
        title="Домашняя еда от лучших поваров вашего города"
        subtitle="Закажите свежие домашние блюда с доставкой"
        description="Откройте для себя вкус домашней еды, приготовленной с любовью нашими талантливыми поварами. Быстрая доставка, свежие ингредиенты и неповторимый вкус."
        primaryCta={{
          text: "Перейти в каталог",
          href: "/dishes",
        }}
        secondaryCta={{
          text: "Узнать больше",
          href: "/categories",
        }}
        backgroundImage={heroPrimary}
      />

      <HomeCollections />

      <HomeCardsSection
        categories={categories}
        recommended={recommended}
        discountedDishes={discountedDishes}
        soonDishes={soonDishes}
        catPlaceholder={catPlaceholder}
        subcatsPlaceholder={subcatsPlaceholder}
        recPlaceholderTop={recPlaceholderTop}
        recPlaceholderMore={recPlaceholderMore}
        promosPlaceholder={promosPlaceholder}
      />

      {/* Reviews Section - Social proof and trust building */}
      <ReviewsSection />
    </main>
  );
}
