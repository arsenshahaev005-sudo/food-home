'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  category?: string;
  allowMultiple?: boolean;
  className?: string;
}

const FAQAccordion = ({ 
  items, 
  category,
  allowMultiple = false,
  className = ''
}: FAQAccordionProps) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const handleToggle = (itemId: string) => {
    if (allowMultiple) {
      setOpenItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      setOpenItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(itemId);
        }
        return newSet;
      });
    }
  };

  const handleKeyDown = (event: { key: string }, itemId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(itemId);
    }
  };

  return (
    <div className={`space-y-3 ${className}`} role="region" aria-label={category || 'Часто задаваемые вопросы'}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);

        return (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Question Button */}
            <button
              onClick={() => handleToggle(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              type="button"
            >
              <span className="text-left font-medium text-gray-900">{item.question}</span>
              <ChevronDown 
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Answer */}
            <div
              id={`faq-answer-${item.id}`}
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
              role="region"
              aria-labelledby={`faq-question-${item.id}`}
            >
              <div className="px-6 py-4 bg-white">
                <div className="prose prose-sm text-gray-700">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FAQAccordion;
