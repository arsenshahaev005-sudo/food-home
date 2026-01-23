'use client';

import { useState, useEffect } from 'react';
import BlogCard from '@/components/blog/BlogCard';
import MetaTags from '@/components/seo/MetaTags';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  category: string;
  slug: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const categories = [
    { id: 'all', name: 'Все статьи' },
    { id: 'recipes', name: 'Рецепты' },
    { id: 'tips', name: 'Советы' },
    { id: 'news', name: 'Новости' },
    { id: 'cooking', name: 'Кулинария' }
  ];

  const samplePosts: BlogPost[] = [
    {
      id: '1',
      title: '5 секретов идеальной домашней пасты',
      excerpt: 'Узнайте, как приготовить идеальную домашнюю пасту, которая станет любимой на вашем столе. Наши эксперты делятся лучшими секретами.',
      content: 'Полная статья о приготовлении домашней пасты...',
      image: '/hero-user.jpg',
      author: 'Анна Иванова',
      date: '2024-01-15',
      readTime: '5 мин',
      category: 'recipes',
      slug: 'ideal-domashnyaya-pasta'
    },
    {
      id: '2',
      title: 'Как выбрать свежие продукты на рынке',
      excerpt: 'Наши эксперты рассказывают, на что обращать внимание при выборе продуктов и как определить их качество.',
      content: 'Полная статья о выборе продуктов...',
      image: '/hero-user.jpg',
      author: 'Михаил Петров',
      date: '2024-01-10',
      readTime: '7 мин',
      category: 'tips',
      slug: 'vybor-svezhih-produktov'
    },
    {
      id: '3',
      title: 'Новые функции платформы HomeFood',
      excerpt: 'Мы постоянно работаем над улучшением сервиса и добавлением новых функций для удобства пользователей.',
      content: 'Полная статья о новых функциях...',
      image: '/hero-user.jpg',
      author: 'Елена Сидорова',
      date: '2024-01-05',
      readTime: '3 мин',
      category: 'news',
      slug: 'novye-funktsii-platformy'
    },
    {
      id: '4',
      title: 'Основы правильного питания',
      excerpt: 'Наши эксперты-повара делятся основами здорового питания и дают советы по сбалансированному рациону.',
      content: 'Полная статья о правильном питании...',
      image: '/hero-user.jpg',
      author: 'Дмитрий Козлов',
      date: '2024-01-01',
      readTime: '6 мин',
      category: 'cooking',
      slug: 'osnovy-pravilnogo-pitaniya'
    },
    {
      id: '5',
      title: 'История домашней кухни',
      excerpt: 'Путешествие по истории кулинарных традиций и секреты бабушкиных рецептов.',
      content: 'Полная статья о истории домашней кухни...',
      image: '/hero-user.jpg',
      author: 'Ольга Николаева',
      date: '2023-12-20',
      readTime: '8 мин',
      category: 'cooking',
      slug: 'istoriya-domashney-kuhni'
    }
  ];

  return (
    <>
      <MetaTags
        title="Блог - HomeFood Marketplace"
        description="Блог с рецептами, советами по кулинарии и новостями о домашней еде и правильном питании."
        keywords="блог, рецепты, кулинария, советы, новости, домашняя еда, правильное питание"
        ogType="article"
        noIndex={false}
        noFollow={false}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold text-gray-900">Блог</h1>
            <p className="text-gray-600">Рецепты, советы по кулинарии и новости о домашней еде</p>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Загрузка">
                <div className="sr-only">Загрузка...</div>
              </div>
            </div>
          ) : (
            <>
              {/* Categories */}
              <div className="flex flex-wrap justify-center gap-3 mb-8" role="tablist" aria-label="Категории блога">
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      role="tab"
                      aria-selected={isSelected}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>

              {/* Blog Posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {samplePosts.map((post) => (
                  <BlogCard
                    key={post.id}
                    title={post.title}
                    excerpt={post.excerpt}
                    image={post.image}
                    author={post.author}
                    authorAvatar={post.authorAvatar}
                    date={post.date}
                    readTime={post.readTime}
                    category={post.category}
                    slug={post.slug}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Подпишитесь на наши новости и рецепты
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Связаться с поддержкой"
              >
                Связаться с поддержкой
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
