'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const HomeIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const CatalogIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const CartIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const ProfileIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

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

  const handleNavClick = (): void => {
    // Navigation is handled by Link component
  };

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
