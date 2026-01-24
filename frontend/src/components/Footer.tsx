'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-amber-900 to-orange-950 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Navigation Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Навигация</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Главная
                </Link>
              </li>
              <li>
                <Link 
                  href="/dishes" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Рестораны
                </Link>
              </li>
              <li>
                <Link 
                  href="/categories" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Категории
                </Link>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  О нас
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Категории блюд</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dishes?category=breakfast" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Завтраки
                </Link>
              </li>
              <li>
                <Link 
                  href="/dishes?category=dinner" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Обеды и ужины
                </Link>
              </li>
              <li>
                <Link 
                  href="/dishes?category=desserts" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Десерты
                </Link>
              </li>
              <li>
                <Link 
                  href="/dishes?category=drinks" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Напитки
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacts Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Контакты</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@food-home.ru" className="text-gray-300 hover:text-white transition-colors duration-200">
                  info@food-home.ru
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
                </svg>
                <a href="tel:+74951234567" className="text-gray-300 hover:text-white transition-colors duration-200">
                  +7 (495) 123-45-67
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <address className="text-gray-300 not-italic">
                  г. Москва, ул. Тверская, д. 1<br />
                  офис 100
                </address>
              </div>
            </div>
          </div>

          {/* Social Media Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Мы в соцсетях</h3>
            <div className="flex space-x-4">
              <a 
                href="https://vk.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
                aria-label="ВКонтакте"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.074 20.574h2.92v-5.465c0-2.827.676-4.483 3.224-4.483 1.455 0 2.427.973 2.427 2.427v2.923h-2.427c-1.915 0-2.427 1.27-2.427 2.427v2.171h4.854l-.539 2.923h-4.315v7.077z"/>
                </svg>
              </a>
              <a 
                href="https://telegram.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
                aria-label="Telegram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325l.59 3.462c.01.062.015.125.015.185 0 .145-.035.27-.115.338-.23l-1.417-.925-1.417.925a.484.484 0 0 1-.338.23c-.06 0-.123-.005-.185-.015l.59-3.462a.506.506 0 0 1 .171-.325c.144-.117.365-.142.465-.14h8.388z"/>
                </svg>
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.204-.012 3.584-.07 4.85-.07 3.252-.148 4.771-1.691 4.919-4.919.058-1.265.069-1.645.069-4.849zm0-2.163c-3.204 0-3.584-.012-4.85-.07-3.252-.148-4.771-1.691-4.919-4.919.058-1.265.069-1.645.069-4.849z"/>
                  <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                </svg>
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-700 transition-all duration-200"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 14.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} Food Home. Все права защищены.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link 
                href="/legal/privacy" 
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Политика конфиденциальности
              </Link>
              <Link 
                href="/legal/offer" 
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Пользовательское соглашение
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;