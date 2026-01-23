# Отчет о кодовом анализе: Проблемы с Navbar, Footer и Анимациями

**Дата анализа:** 2026-01-23  
**Проект:** Food Home Frontend  
**Тип анализа:** Глубокий анализ кодовой базы для выявления потенциальных проблем

---

## 📋 Краткое резюме

В ходе анализа кодовой базы были выявлены **критические проблемы** с архитектурой навигации и компонентами. Хотя Playwright инспекция показала, что элементы технически присутствуют на странице, анализ кода выявил **фундаментальные проблемы с импортированием и использованием компонентов**.

### 🔴 Критические проблемы:
1. **Компонент [`Header.tsx`](food-home/frontend/src/components/Header.tsx) существует, но НЕ ИСПОЛЬЗУЕТСЯ**
2. **Компонент [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx) существует, но НЕ ИСПОЛЬЗУЕТСЯ**
3. **Компонент [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx) существует, но НЕ ИСПОЛЬЗУЕТСЯ**
4. **Файл [`responsive.css`](food-home/frontend/src/styles/responsive.css) существует, но НЕ ИМПОРТИРУЕТСЯ**
5. **Дублирование навигации в разных layout'ах**

---

## 🔍 Детальный анализ по категориям

### 1. Структура Layout'ов

#### 1.1 Root Layout ([`layout.tsx`](food-home/frontend/src/app/layout.tsx))

```typescript
// food-home/frontend/src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

**Проблема:** Root layout не содержит никакого navbar или footer - это ожидаемо, так как это базовый layout.

---

#### 1.2 Main Layout ([`(main)/layout.tsx`](food-home/frontend/src/app/(main)/layout.tsx))

```typescript
// food-home/frontend/src/app/(main)/layout.tsx
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Food Home</h1>
            <div className="space-x-4">
              <a href="/auth/login" className="text-blue-600 hover:text-blue-800">
                Войти
              </a>
              <a href="/auth/register" className="text-blue-600 hover:text-blue-800">
                Регистрация
              </a>
            </div>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Food Home. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
```

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** Main layout использует **встроенный (inline) header** вместо готового компонента [`Header.tsx`](food-home/frontend/src/components/Header.tsx).

**Почему это проблема:**
- Дублирование кода навигации
- Отсутствие функционала из [`Header.tsx`](food-home/frontend/src/components/Header.tsx) (SearchBar, CartMenu, ProfileMenu, AddressCapsule)
- Несоответствие дизайна и функционала
- Сложность поддержки и обновления

---

#### 1.3 Seller Layout ([`(seller)/layout.tsx`](food-home/frontend/src/app/(seller)/layout.tsx))

```typescript
// food-home/frontend/src/app/(seller)/layout.tsx
export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] bg-[#c9825b] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
      >
        {/* SVG icons */}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200 h-screen" />}>
          <SellerSidebar />
        </Suspense>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** Seller layout НЕ использует [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx) компонент.

**Почему это проблема:**
- Компонент [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx) существует с полной навигацией, но не используется
- Отсутствие навигационных табов в seller layout
- Потеря функционала (кнопка выхода, навигация между разделами)

---

### 2. Существующие, но неиспользуемые компоненты

#### 2.1 Компонент Header ([`Header.tsx`](food-home/frontend/src/components/Header.tsx))

```typescript
// food-home/frontend/src/components/Header.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import CartMenu from "@/components/CartMenu";
import AddressCapsule from "@/components/AddressCapsule";
import SearchBar from "@/components/SearchBar";
import ProfileMenu from "@/components/ProfileMenu";

export default async function Header() {
  const token = (await cookies()).get("accessToken")?.value;
  return (
    <header
      className="sticky top-0 z-30"
      style={{ backgroundColor: "#fdf6ef", boxShadow: "var(--shadow-soft)" }}
    >
      <div className="mx-auto max-w-6xl px-4 h-20 flex items-center gap-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image 
            src="/logo.svg" 
            alt="Food&Home" 
            width={200} 
            height={32} 
            className="object-contain h-8 w-auto"
            priority
          />
        </Link>

        <div className="flex-1">
          <SearchBar />
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <AddressCapsule />
          <CartMenu token={token} />
          <ProfileMenu token={token} />
        </nav>
      </div>
    </header>
  );
}
```

**Характеристики компонента:**
- Server component (использует `cookies()`)
- Содержит полный функционал: логотип, поиск, адрес, корзина, профиль
- Sticky позиционирование
- Правильные стили и z-index

**Статус:** ✅ **Компонент существует и полностью функционален**  
**Проблема:** ❌ **Нигде не импортируется и не используется**

---

#### 2.2 Компонент SellerHeader ([`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx))

```typescript
// food-home/frontend/src/components/SellerHeader.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function SellerHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentView = searchParams.get("view") || "OVERVIEW";
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0";
    router.push("/auth/login");
    router.refresh();
  };

  const tabs = [
    { id: 'PROFILE', label: 'Профиль' },
    { id: 'ORDERS', label: 'Заказы' },
    { id: 'PRODUCTS', label: 'Товары' },
    { id: 'PROGRESS', label: 'Прогресс' },
    { id: 'STATISTICS', label: 'Статистика' },
    { id: 'FINANCE', label: 'Финансы' },
    { id: 'CHAT', label: 'Чат' },
    { id: 'REVIEWS', label: 'Отзывы' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Navigation Tabs */}
          <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => {
               const isActive = currentView === tab.id;
               return (
                <Link
                  key={tab.id}
                  href={`/seller?view=${tab.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#c9825b] text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-[#fff5f0] hover:text-[#c9825b]'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="flex items-center pl-4 border-l border-gray-200 ml-4">
             <button 
                onClick={handleLogout}
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap"
                style={{
                    backgroundColor: isLogoutHovered ? '#c9825b' : '#ffffff',
                    color: isLogoutHovered ? '#ffffff' : '#4b5563',
                }}
             >
                {/* SVG icon */}
                <span>Выйти</span>
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

**Характеристики компонента:**
- Client component
- Содержит полную навигацию по разделам продавца
- Функционал выхода из системы
- Правильные стили и z-index
- Sticky позиционирование

**Статус:** ✅ **Компонент существует и полностью функционален**  
**Проблема:** ❌ **Нигде не импортируется и не используется**

---

#### 2.3 Компонент MobileNavigation ([`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx))

```typescript
// food-home/frontend/src/components/layout/MobileNavigation.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mobileNavItems: MobileNavItem[] = [
  {
    label: 'Главная',
    href: '/',
    icon: <HomeIcon />,
  },
  {
    label: 'Каталог',
    href: '/dishes',
    icon: <CatalogIcon />,
  },
  {
    label: 'Корзина',
    href: '/cart',
    icon: <CartIcon />,
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: <ProfileIcon />,
  },
];

const MobileNavigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-nav"
      role="navigation"
      aria-label="Мобильная навигация"
    >
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="mobile-nav-icon" aria-hidden="true">
              {item.icon}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNavigation;
```

**Характеристики компонента:**
- Client component
- Содержит 4 пункта навигации для мобильных устройств
- Использует CSS классы `.mobile-nav`, `.mobile-nav-item`, `.mobile-nav-icon`, `.mobile-nav-label`

**Статус:** ✅ **Компонент существует и полностью функционален**  
**Проблема:** ❌ **Нигде не импортируется и не используется**

---

### 3. Проблемы со стилями (CSS)

#### 3.1 Файл responsive.css ([`responsive.css`](food-home/frontend/src/styles/responsive.css))

**Содержимое файла:**
- Стили для `.mobile-nav` (строки 8-21)
- Стили для `.mobile-nav-item` (строки 23-38)
- Стили для `.mobile-nav-icon` (строки 40-44)
- Стили для `.mobile-nav-label` (строки 46-49)
- Медиа-запросы для адаптивности

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** Файл [`responsive.css`](food-home/frontend/src/styles/responsive.css) существует, но **НЕ ИМПОРТИРУЕТСЯ** в [`globals.css`](food-home/frontend/src/app/globals.css) или в любом другом месте.

**Почему это проблема:**
- Стили для `.mobile-nav` не применяются
- Компонент [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx) не будет отображаться корректно
- Мобильная навигация не будет работать

---

#### 3.2 Проверка импорта responsive.css

**Результаты поиска:**
- ❌ Нет импорта в [`globals.css`](food-home/frontend/src/app/globals.css)
- ❌ Нет импорта в других CSS файлах
- ❌ Нет импорта в компонентах

**Текущее содержимое [`globals.css`](food-home/frontend/src/app/globals.css):**
```css
@import "tailwindcss";

:root {
  --background: #E8DDD2;
  --foreground: #4b2f23;
  /* ... другие переменные ... */
}

/* ... другие стили ... */
```

**Отсутствует:** `@import "./styles/responsive.css";`

---

### 4. Анализ анимаций

#### 4.1 Определения анимаций в [`globals.css`](food-home/frontend/src/app/globals.css)

```css
@keyframes warmFadeIn {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes warmFadeOut {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(4px); }
}

@keyframes warmZoomIn {
  0% { opacity: 0; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes warmZoomOut {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.98); }
}
```

**Статус:** ✅ **Анимации определены корректно**

---

#### 4.2 Использование анимаций в коде

**Найденные использования:**

1. **[`PasswordChangeModal.tsx`](food-home/frontend/src/components/PasswordChangeModal.tsx:127)**
```tsx
<div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[warmFadeIn_0.3s_ease-out]">
```

2. **[`DishQuickViewModal.tsx`](food-home/frontend/src/components/DishQuickViewModal.tsx:461)**
```tsx
closing ? "animate-[warmZoomOut_0.22s_ease-in_forwards]" : "animate-in zoom-in-95 duration-300"
```

3. **[`DeliveryZonesModal.tsx`](food-home/frontend/src/components/DeliveryZonesModal.tsx:127)**
```tsx
<div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-[warmFadeIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
```

4. **[`CategoriesMegaMenu.tsx`](food-home/frontend/src/components/CategoriesMegaMenu.tsx:187)**
```tsx
style={{ animation: "warmFadeIn 200ms ease both" }}
```

5. **[`AddressCapsule.tsx`](food-home/frontend/src/components/AddressCapsule.tsx:180)**
```tsx
style={{ backgroundColor: "rgba(0,0,0,0.25)", animation: "warmFadeIn 200ms ease both", zIndex: 50 }}
```

**Статус:** ✅ **Анимации используются корректно в модальных окнах и компонентах**

---

#### 4.3 Конфигурация Tailwind ([`tailwind.config.ts`](food-home/frontend/tailwind.config.ts))

**Определенные keyframes в Tailwind:**
```typescript
keyframes: {
  'accordion-down': { ... },
  'accordion-up': { ... },
  'fade-in': { ... },
  'fade-out': { ... },
  'slide-in-from-top': { ... },
  'slide-in-from-bottom': { ... },
  'slide-in-from-left': { ... },
  'slide-in-from-right': { ... },
}
```

**Определенные animations в Tailwind:**
```typescript
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'fade-in': 'fade-in 0.5s ease-in-out',
  'fade-out': 'fade-out 0.5s ease-in-out',
  'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
  'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
  'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
  'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
}
```

**Проблема:** ❌ **Анимации `warmFadeIn`, `warmFadeOut`, `warmZoomIn`, `warmZoomOut` НЕ определены в Tailwind config**

**Почему это проблема:**
- Анимации используются через inline styles или произвольные значения Tailwind
- Нет унифицированного подхода к анимациям
- Сложность поддержки и переиспользования

---

### 5. Анализ Footer

#### 5.1 Footer в Main Layout

```typescript
// food-home/frontend/src/app/(main)/layout.tsx
<footer className="bg-gray-800 text-white py-8 mt-12">
  <div className="container mx-auto px-4 text-center">
    <p>&copy; 2024 Food Home. Все права защищены.</p>
  </div>
</footer>
```

**Статус:** ✅ **Footer существует и используется в main layout**

**Проблема:** ⚠️ **Footer очень простой и не содержит полезной информации**

**Рекомендации:**
- Добавить ссылки на разделы
- Добавить контактную информацию
- Добавить социальные сети
- Добавить ссылки на юридическую информацию (политика конфиденциальности, условия использования)

---

#### 5.2 Footer в других страницах

**Найденные footer'ы:**

1. **[`faq/page.tsx`](food-home/frontend/src/app/(main)/faq/page.tsx:163-178)**
```tsx
<footer className="bg-white border-t border-gray-200 mt-8">
  <div className="max-w-4xl mx-auto px-4 py-6">
    {/* Содержимое footer */}
  </div>
</footer>
```

2. **[`blog/page.tsx`](food-home/frontend/src/app/(main)/blog/page.tsx:181-196)**
```tsx
<footer className="bg-white border-t border-gray-200 mt-8">
  <div className="max-w-4xl mx-auto px-4 py-6">
    {/* Содержимое footer */}
  </div>
</footer>
```

**Проблема:** ⚠️ **Дублирование footer'ов на разных страницах**

---

### 6. Потенциальные источники проблем

На основе анализа я выделил **5-7 возможных источников проблем**:

#### 1. ❌ **Компонент Header не импортируется в Main Layout** (КРИТИЧЕСКИЙ)
- **Файл:** [`(main)/layout.tsx`](food-home/frontend/src/app/(main)/layout.tsx)
- **Проблема:** Вместо готового компонента [`Header.tsx`](food-home/frontend/src/components/Header.tsx) используется встроенный header
- **Последствия:** Отсутствие SearchBar, CartMenu, ProfileMenu, AddressCapsule

#### 2. ❌ **Компонент SellerHeader не импортируется в Seller Layout** (КРИТИЧЕСКИЙ)
- **Файл:** [`(seller)/layout.tsx`](food-home/frontend/src/app/(seller)/layout.tsx)
- **Проблема:** Компонент [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx) существует, но не используется
- **Последствия:** Отсутствие навигационных табов и кнопки выхода

#### 3. ❌ **Компонент MobileNavigation не импортируется никуда** (КРИТИЧЕСКИЙ)
- **Файл:** [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx)
- **Проблема:** Компонент существует, но не используется
- **Последствия:** Отсутствие мобильной навигации

#### 4. ❌ **Файл responsive.css не импортируется** (КРИТИЧЕСКИЙ)
- **Файл:** [`responsive.css`](food-home/frontend/src/styles/responsive.css)
- **Проблема:** Стили для мобильной навигации не загружаются
- **Последствия:** MobileNavigation не будет работать корректно

#### 5. ⚠️ **Анимации warm* не определены в Tailwind config** (СРЕДНИЙ)
- **Файл:** [`tailwind.config.ts`](food-home/frontend/tailwind.config.ts)
- **Проблема:** Анимации используются, но не определены в конфигурации
- **Последствия:** Несогласованность в использовании анимаций

#### 6. ⚠️ **Дублирование footer'ов на разных страницах** (СРЕДНИЙ)
- **Файлы:** [`faq/page.tsx`](food-home/frontend/src/app/(main)/faq/page.tsx), [`blog/page.tsx`](food-home/frontend/src/app/(main)/blog/page.tsx)
- **Проблема:** Footer дублируется вместо использования единого компонента
- **Последствия:** Сложность поддержки и обновления

#### 7. ⚠️ **Отсутствие единого Footer компонента** (СРЕДНИЙ)
- **Проблема:** Footer реализован inline в layout'ах
- **Последствия:** Нет переиспользуемости и согласованности

---

## 🎯 Наиболее вероятные источники проблем (Топ-2)

### 1. ❌ **Компоненты Header, SellerHeader и MobileNavigation не импортируются**

**Почему это наиболее вероятно:**
- Playwright показывает, что navbar технически присутствует (простой header в main layout)
- Но пользователь жалуется на проблемы с navbar - это означает, что ожидается более функциональный navbar
- Компоненты [`Header.tsx`](food-home/frontend/src/components/Header.tsx), [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx), [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx) существуют, но не используются

**Как проверить:**
```typescript
// В (main)/layout.tsx добавить:
import Header from "@/components/Header";

// В (seller)/layout.tsx добавить:
import SellerHeader from "@/components/SellerHeader";

// В (main)/layout.tsx или RootLayout добавить:
import MobileNavigation from "@/components/layout/MobileNavigation";
```

### 2. ❌ **Файл responsive.css не импортируется**

**Почему это наиболее вероятно:**
- Компонент [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx) использует CSS классы из [`responsive.css`](food-home/frontend/src/styles/responsive.css)
- Если [`responsive.css`](food-home/frontend/src/styles/responsive.css) не загружен, стили не применяются
- Это может привести к тому, что MobileNavigation невидим или отображается некорректно

**Как проверить:**
```css
/* В globals.css добавить: */
@import "./styles/responsive.css";
```

---

## 📝 Рекомендации по исправлению

### Приоритет 1 (Критический):

1. **Импортировать Header в Main Layout**
   - Файл: [`(main)/layout.tsx`](food-home/frontend/src/app/(main)/layout.tsx)
   - Заменить встроенный header на компонент [`Header.tsx`](food-home/frontend/src/components/Header.tsx)

2. **Импортировать SellerHeader в Seller Layout**
   - Файл: [`(seller)/layout.tsx`](food-home/frontend/src/app/(seller)/layout.tsx)
   - Добавить компонент [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx)

3. **Импортировать responsive.css**
   - Файл: [`globals.css`](food-home/frontend/src/app/globals.css)
   - Добавить `@import "./styles/responsive.css";`

4. **Импортировать MobileNavigation**
   - Файл: [`(main)/layout.tsx`](food-home/frontend/src/app/(main)/layout.tsx) или [`layout.tsx`](food-home/frontend/src/app/layout.tsx)
   - Добавить компонент [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx)

### Приоритет 2 (Средний):

5. **Добавить анимации warm* в Tailwind config**
   - Файл: [`tailwind.config.ts`](food-home/frontend/tailwind.config.ts)
   - Добавить keyframes и animation для warmFadeIn, warmFadeOut, warmZoomIn, warmZoomOut

6. **Создать единый Footer компонент**
   - Создать файл: [`Footer.tsx`](food-home/frontend/src/components/Footer.tsx)
   - Заменить встроенные footer'ы на компонент

### Приоритет 3 (Низкий):

7. **Удалить дублирование footer'ов**
   - Объединить footer'ы в [`faq/page.tsx`](food-home/frontend/src/app/(main)/faq/page.tsx) и [`blog/page.tsx`](food-home/frontend/src/app/(main)/blog/page.tsx)

---

## 📊 Таблица состояния компонентов

| Компонент | Файл | Статус | Используется | Проблема |
|-----------|------|--------|-------------|----------|
| Header | [`Header.tsx`](food-home/frontend/src/components/Header.tsx) | ✅ Существует | ❌ Нет | Не импортируется |
| SellerHeader | [`SellerHeader.tsx`](food-home/frontend/src/components/SellerHeader.tsx) | ✅ Существует | ❌ Нет | Не импортируется |
| MobileNavigation | [`MobileNavigation.tsx`](food-home/frontend/src/components/layout/MobileNavigation.tsx) | ✅ Существует | ❌ Нет | Не импортируется |
| Footer | - | ⚠️ Inline | ✅ Да | Не переиспользуется |
| responsive.css | [`responsive.css`](food-home/frontend/src/styles/responsive.css) | ✅ Существует | ❌ Нет | Не импортируется |
| Анимации warm* | [`globals.css`](food-home/frontend/src/app/globals.css) | ✅ Определены | ✅ Используются | ⚠️ Не в Tailwind config |

---

## 🔧 Техническая информация

**Инструмент анализа:** Ручной анализ кодовой базы  
**Проанализированные файлы:** 20+  
**Количество найденных проблем:** 7  
**Критических проблем:** 4  
**Средних проблем:** 3  

---

**Отчет создан:** 2026-01-23T14:22:00Z  
**Анализатор:** Debug Mode (Systematic problem diagnosis)
