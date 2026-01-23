'use client';

import { useState, useEffect } from 'react';
import FAQSection from '@/components/faq/FAQSection';

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

export default function FaqPage() {
  const [categories, setCategories] = useState<FAQCategory[]>([
    {
      id: 'delivery',
      name: 'Доставка',
      icon: 'delivery',
      items: [
        {
          id: 'delivery-1',
          question: 'Какие способы доставки доступны?',
          answer: 'Мы предлагаем доставку курьером и самовывоз. Курьерская доставка доступна в пределах города, а самовывоз - из нашего пункта выдачи.'
        },
        {
          id: 'delivery-2',
          question: 'Сколько времени занимает доставка?',
          answer: 'Время доставки зависит от района и загруженности курьера. Обычно доставка занимает от 30 минут до 2 часов в рабочее время.'
        },
        {
          id: 'delivery-3',
          question: 'Можно ли отследить заказ?',
          answer: 'Да, вы можете отследить статус заказа в личном кабинете. Мы также отправляем уведомления на email и в приложение.'
        },
        {
          id: 'delivery-4',
          question: 'Что делать, если заказ задерживается?',
          answer: 'Если заказ задерживается более чем на 30 минут, пожалуйста, свяжитесь с нашей службой поддержки через форму обратной связи или по телефону.'
        }
      ]
    },
    {
      id: 'payment',
      name: 'Оплата',
      icon: 'payment',
      items: [
        {
          id: 'payment-1',
          question: 'Какие способы оплаты доступны?',
          answer: 'Мы принимаем оплату банковскими картами (Visa, MasterCard, МИР), Apple Pay, Google Pay и наличными при получении заказа.'
        },
        {
          id: 'payment-2',
          question: 'Безопасна ли онлайн-оплата?',
          answer: 'Да, мы используем защищенные платежные системы и соблюдаем все требования PCI DSS для обработки платежей.'
        },
        {
          id: 'payment-3',
          question: 'Можно ли оплатить заказ при получении?',
          answer: 'Да, вы можете оплатить заказ наличными или картой при получении у курьера.'
        },
        {
          id: 'payment-4',
          question: 'Как вернуть деньги при отмене заказа?',
          answer: 'При отмене заказа до начала приготовления блюда возврат средств осуществляется автоматически на ту же карту, которой была произведена оплата.'
        }
      ]
    },
    {
      id: 'orders',
      name: 'Заказы',
      icon: 'orders',
      items: [
        {
          id: 'orders-1',
          question: 'Как изменить или отменить заказ?',
          answer: 'Вы можете изменить или отменить заказ в личном кабинете до того, как начнется приготовление блюда. Отмена возможна в течение 15 минут после оформления заказа.'
        },
        {
          id: 'orders-2',
          question: 'Можно ли повторить заказ?',
          answer: 'Да, вы можете быстро оформить повторный заказ из истории заказов в личном кабинете.'
        },
        {
          id: 'orders-3',
          question: 'Как узнать статус заказа?',
          answer: 'Статус заказа отображается в личном кабинете. Вы также получите push-уведомление о каждом изменении статуса.'
        },
        {
          id: 'orders-4',
          question: 'Что делать, если заказ не пришел?',
          answer: 'Если заказ не пришел в указанное время, пожалуйста, свяжитесь с нашей службой поддержки через форму обратной связи.'
        }
      ]
    },
    {
      id: 'general',
      name: 'Общие вопросы',
      icon: 'general',
      items: [
        {
          id: 'general-1',
          question: 'Как работает сервис?',
          answer: 'HomeFood Marketplace - это платформа, где частные повара и кулинарные студии продают домашнюю еду. Вы можете просмотреть меню, выбрать понравившиеся блюда и оформить заказ с доставкой или самовывозом.'
        },
        {
          id: 'general-2',
          question: 'Как стать продавцом на платформе?',
          answer: 'Чтобы стать продавцом, заполните заявку на регистрацию продавца. Мы проверим документы и одобрим вашу заявку в течение 3-5 рабочих дней.'
        },
        {
          id: 'general-3',
          question: 'Гарантируется ли качество еды?',
          answer: 'Да, мы работаем только с проверенными продавцами и регулярно проводим контроль качества. Если вы не удовлетворены качеством заказа, вы можете оформить жалобу.'
        },
        {
          id: 'general-4',
          question: 'Как связаться с поддержкой?',
          answer: 'Вы можете связаться с нашей службой поддержки через форму обратной связи на сайте, по email support@homefood.ru или по телефону 8-800-123-45-67.'
        }
      ]
    }
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Часто задаваемые вопросы</h1>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Загрузка">
              <div className="sr-only">Загрузка...</div>
            </div>
          </div>
        ) : (
          <FAQSection categories={categories} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Не нашли ответ на свой вопрос?
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
  );
}
