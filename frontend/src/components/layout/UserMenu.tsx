'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, ShoppingBag, Heart, Settings, ChevronDown } from 'lucide-react';

export interface UserMenuProps {
  userName?: string;
  userAvatar?: string;
  token?: string | null;
  className?: string;
}

const UserMenu = ({ userName = 'Гость', userAvatar, token, className = '' }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent, path: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.location.href = path;
    }
  };

  if (!token) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link
          href="/auth/login"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
          aria-label="Войти в аккаунт"
        >
          Войти
        </Link>
        <Link
          href="/auth/register"
          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Зарегистрироваться"
        >
          Регистрация
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Меню пользователя"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="relative">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {userName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in-down"
          role="menu"
          aria-label="Меню пользователя"
        >
          <div className="px-4 py-2 border-b border-gray-100 mb-2">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
          </div>

          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors focus:outline-none focus:bg-gray-50 focus:text-primary"
            role="menuitem"
            onKeyDown={(e) => handleMenuKeyDown(e as unknown as KeyboardEvent, '/profile')}
          >
            <User className="w-4 h-4" aria-hidden="true" />
            <span>Профиль</span>
          </Link>

          <Link
            href="/orders"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors focus:outline-none focus:bg-gray-50 focus:text-primary"
            role="menuitem"
            onKeyDown={(e) => handleMenuKeyDown(e as unknown as KeyboardEvent, '/orders')}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Мои заказы</span>
          </Link>

          <Link
            href="/favorites"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors focus:outline-none focus:bg-gray-50 focus:text-primary"
            role="menuitem"
            onKeyDown={(e) => handleMenuKeyDown(e as unknown as KeyboardEvent, '/favorites')}
          >
            <Heart className="w-4 h-4" aria-hidden="true" />
            <span>Избранное</span>
          </Link>

          <div className="border-t border-gray-100 my-2" />

          <Link
            href="/profile/settings"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors focus:outline-none focus:bg-gray-50 focus:text-primary"
            role="menuitem"
            onKeyDown={(e) => handleMenuKeyDown(e as unknown as KeyboardEvent, '/profile/settings')}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span>Настройки</span>
          </Link>

          <div className="border-t border-gray-100 my-2" />

          <button
            onClick={() => {
              // Handle logout logic here
              window.location.href = '/auth/login';
            }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-50 transition-colors w-full text-left focus:outline-none focus:bg-error-50"
            role="menuitem"
            aria-label="Выйти из аккаунта"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Выйти</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
