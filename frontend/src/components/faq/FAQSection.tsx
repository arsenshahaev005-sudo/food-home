'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, MessageCircle, Package, Clock, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import FAQAccordion from './FAQAccordion';
import FAQSearch from './FAQSearch';
import AskQuestionForm from './AskQuestionForm';
import { getHelpArticles, getHelpArticleCategories, searchHelpArticles, HelpArticle } from '@/lib/api/faqApi';

export interface FAQCategory {
  id: string;
  name: string;
  icon: 'delivery' | 'payment' | 'orders' | 'general';
  items: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

export interface FAQSectionProps {
  categories: FAQCategory[];
  token?: string;
  className?: string;
}

const FAQSection = ({ categories: initialCategories, token = '', className = '' }: FAQSectionProps) => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [, setApiCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const categoryIcons: Record<string, any> = {
    delivery: <Clock className="w-5 h-5" />,
    payment: <CreditCard className="w-5 h-5" />,
    orders: <Package className="w-5 h-5" />,
    general: <HelpCircle className="w-5 h-5" />
  };

  const getCategoryIcon = (categoryName: string): 'delivery' | 'payment' | 'orders' | 'general' => {
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('доставк') || lowerName.includes('delivery')) return 'delivery';
    if (lowerName.includes('оплат') || lowerName.includes('payment')) return 'payment';
    if (lowerName.includes('заказ') || lowerName.includes('order')) return 'orders';
    return 'general';
  };

  // Load articles and categories from API if token is provided
  useEffect(() => {
    if (!token) return;
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [articlesData, categoriesData] = await Promise.all([
          getHelpArticles(token),
          getHelpArticleCategories(token)
        ]);
        setArticles(articlesData);
        setApiCategories(categoriesData);
      } catch (err: any) {
        console.error('Error loading FAQ:', err);
        setError('Не удалось загрузить FAQ. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Convert articles to categories format
  const getFAQCategories = (): FAQCategory[] => {
    // If we have API data, use it; otherwise use initialCategories
    if (articles.length > 0) {
      const grouped: Record<string, HelpArticle[]> = {};
      
      articles.forEach(article => {
        if (!grouped[article.category]) {
          grouped[article.category] = [];
        }
        grouped[article.category].push(article);
      });

      return Object.entries(grouped).map(([categoryName, items]) => ({
        id: categoryName,
        name: categoryName,
        icon: getCategoryIcon(categoryName),
        items: items
          .sort((a, b) => a.order - b.order)
          .map(article => ({
            id: article.id,
            question: article.title,
            answer: article.content
          }))
      }));
    }
    
    // Use initialCategories if no API data
    return initialCategories;
  };

  const faqCategories = getFAQCategories();

  const filteredCategories = faqCategories.map((category) => ({
    ...category,
    items: category.items.filter((item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter((category) => category.items.length > 0);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory((prev) => prev === categoryId ? null : categoryId);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    
    if (query.trim() && token) {
      try {
        setIsLoading(true);
        const searchResults = await searchHelpArticles(query, token);
        setArticles(searchResults);
      } catch (err: any) {
        console.error('Error searching FAQ:', err);
        setError('Не удалось выполнить поиск. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    } else if (!query.trim()) {
      // Reload all articles when search is cleared
      if (token) {
        try {
          setIsLoading(true);
          const articlesData = await getHelpArticles(token);
          setArticles(articlesData);
        } catch (err: any) {
          console.error('Error loading FAQ:', err);
          setError('Не удалось загрузить FAQ. Пожалуйста, попробуйте позже.');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleQuestionSubmit = () => {
    setShowQuestionForm(false);
    // Optionally reload articles
  };

  if (showQuestionForm) {
    return (
      <section className={`py-12 ${className}`} aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => setShowQuestionForm(false)}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Вернуться к FAQ
          </button>
          <AskQuestionForm
            token={token}
            onSuccess={handleQuestionSubmit}
            onCancel={() => setShowQuestionForm(false)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={`py-12 ${className}`} aria-labelledby="faq-heading">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 
            id="faq-heading"
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Часто задаваемые вопросы
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Не нашли ответ на свой вопрос? Задайте его нам!
          </p>
          <button
            onClick={() => setShowQuestionForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-label="Задать вопрос"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            <span>Задать вопрос</span>
          </button>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <FAQSearch
            onSearch={handleSearch}
            placeholder="Поиск по вопросам..."
            autoFocus={false}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600">Загрузка FAQ...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Categories */}
            {!searchQuery && (
              <div className="flex flex-wrap justify-center gap-3 mb-8" role="tablist" aria-label="Категории FAQ">
                {faqCategories.map((category) => {
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={`category-${category.id}`}
                    >
                      {categoryIcons[category.icon]}
                      <span className="font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FAQ Content */}
            <div className="max-w-4xl mx-auto">
              {searchQuery ? (
                /* Search Results */
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Результаты поиска: "{searchQuery}"
                  </h2>
                  {filteredCategories.length === 0 ? (
                    <div className="text-center py-12">
                      <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                      <p className="text-lg text-gray-600 mb-4">
                        По вашему запросу ничего не найдено. Попробуйте изменить запрос.
                      </p>
                      <button
                        onClick={() => setShowQuestionForm(true)}
                        className="text-orange-500 hover:text-orange-600 font-medium"
                      >
                        Задать вопрос вместо этого
                      </button>
                    </div>
                  ) : (
                    filteredCategories.map((category) => (
                      <div key={category.id} className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          {categoryIcons[category.icon]}
                          <span>{category.name}</span>
                        </h3>
                        <FAQAccordion
                          items={category.items.map((item) => ({
                            id: item.id,
                            question: item.question,
                            answer: item.answer,
                            category: category.name
                          }))}
                          category={category.name}
                          allowMultiple={true}
                        />
                      </div>
                    ))
                  )}
                </div>
              ) : selectedCategory ? (
                /* Selected Category */
                <div>
                  {faqCategories.map((category) => {
                    if (category.id !== selectedCategory) return null;

                    return (
                      <div key={category.id} id={`category-${category.id}`} role="tabpanel" aria-labelledby={`category-${category.id}`}>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                          {categoryIcons[category.icon]}
                          <span>{category.name}</span>
                        </h2>
                        <FAQAccordion
                          items={category.items.map((item) => ({
                            id: item.id,
                            question: item.question,
                            answer: item.answer,
                            category: category.name
                          }))}
                          category={category.name}
                          allowMultiple={true}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* All Categories (Default) */
                <div className="space-y-8">
                  {faqCategories.map((category) => (
                    <div key={category.id} id={`category-${category.id}`} role="tabpanel" aria-labelledby={`category-${category.id}`}>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        {categoryIcons[category.icon]}
                        <span>{category.name}</span>
                      </h2>
                      <FAQAccordion
                        items={category.items.map((item) => ({
                          id: item.id,
                          question: item.question,
                          answer: item.answer,
                          category: category.name
                        }))}
                        category={category.name}
                        allowMultiple={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="max-w-2xl mx-auto mt-12 p-6 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Все еще есть вопросы?
              </h3>
              <p className="text-gray-600 mb-4">
                Наша команда поддержки готова помочь вам с любыми вопросами
              </p>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label="Задать вопрос"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                <span>Задать вопрос</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default FAQSection;
