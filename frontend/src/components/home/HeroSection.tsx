'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  backgroundImage?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title = 'Домашняя еда от лучших поваров вашего города',
  subtitle = 'Закажите свежие домашние блюда с доставкой',
  description = 'Откройте для себя вкус домашней еды, приготовленной с любовью нашими талантливыми поварами. Быстрая доставка, свежие ингредиенты и неповторимый вкус.',
  primaryCta = {
    text: 'Перейти в каталог',
    href: '/dishes',
  },
  secondaryCta = {
    text: 'Узнать больше',
    href: '/categories',
  },
  backgroundImage = '/hero-user.jpg',
}) => {
  const handlePrimaryCtaClick = (): void => {
    // Navigation handled by Link component
  };

  const handleSecondaryCtaClick = (): void => {
    // Navigation handled by Link component
  };

  return (
    <section
      className="relative min-h-[600px] flex items-center justify-center bg-gray-800 rounded-3xl shadow-2xl overflow-hidden mx-4 sm:mx-6 lg:mx-8 pt-6"
      aria-labelledby="hero-title"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-400 rounded-full blur-3xl" style={{ backgroundColor: '#CD845B' }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-300 rounded-full blur-3xl" style={{ backgroundColor: '#E09A70' }} />
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1
              id="hero-title"
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              {title}
            </h1>
            
            <p className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#F5C5A8' }}>
              {subtitle}
            </p>
            
            <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto lg:mx-0">
              {description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href={primaryCta.href}
                onClick={handlePrimaryCtaClick}
                className="px-8 py-4 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                style={{ backgroundColor: '#CD845B' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B86E48'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CD845B'}
              >
                {primaryCta.text}
              </Link>
              
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  onClick={handleSecondaryCtaClick}
                  className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold text-lg hover:border-orange-600 hover:text-orange-600 transition-all duration-300"
                  style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#CD845B';
                    e.currentTarget.style.color = '#CD845B';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#374151';
                  }}
                >
                  {secondaryCta.text}
                </Link>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap gap-8 justify-center lg:justify-start">
              <div className="flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span className="text-gray-200 font-medium">Свежие продукты</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#CD845B' }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="text-gray-200 font-medium">Быстрая доставка</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span className="text-gray-200 font-medium">С любовью</span>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl transform rotate-3 opacity-20" style={{ background: 'linear-gradient(to bottom right, #CD845B, #B86E48)' }} />
              <div className="relative bg-white rounded-3xl shadow-2xl p-4 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <Image
                    src={backgroundImage}
                    alt="Домашняя еда"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1280px) 100vw, 50vw"
                  />
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -bottom-4 -right-4 text-white px-6 py-3 rounded-2xl shadow-lg" style={{ backgroundColor: '#CD845B' }}>
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm opacity-90">Блюд</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
};

export default HeroSection;
