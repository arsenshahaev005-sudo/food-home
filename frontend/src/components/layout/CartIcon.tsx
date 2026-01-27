'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export interface CartIconProps {
  itemCount?: number;
  className?: string;
}

const CartIcon = ({ itemCount = 0, className = '' }: CartIconProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevItemCountRef = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevItemCountRef.current) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = '/cart';
    }
  };

  return (
    <Link
      href="/cart"
      className={`relative group ${className}`}
      aria-label={`Корзина, ${itemCount} товаров`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Cart Icon */}
      <div className={`relative p-2 rounded-full transition-all duration-300 ${
        isAnimating ? 'bg-primary scale-110' : 'bg-gray-100 hover:bg-gray-200'
      }`}>
        <ShoppingBag 
          className={`w-6 h-6 text-gray-700 transition-colors duration-300 ${
            isAnimating ? 'text-white' : 'group-hover:text-primary'
          }`}
          aria-hidden="true"
        />
        
        {/* Item Count Badge */}
        {itemCount > 0 && (
          <span 
            className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white rounded-full transition-all duration-300 ${
              isAnimating ? 'bg-success scale-125' : 'bg-primary'
            }`}
            aria-label={`${itemCount} товаров в корзине`}
          >
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {itemCount === 0 ? 'Корзина пуста' : `${itemCount} товаров`}
        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45" />
      </div>
    </Link>
  );
};

export default CartIcon;
