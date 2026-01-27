/**
 * Accessibility Utilities for HomeFood Marketplace
 * Following WCAG 2.1 AA Standards
 */

/**
 * Check if the user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if the user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
};

/**
 * Check if the user prefers dark mode
 */
export const prefersDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Generate a unique ID for accessibility purposes
 */
export const generateId = (prefix: string = 'a11y'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce a message to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  if (typeof document === 'undefined') return;

  const existingAnnouncer = document.getElementById('a11y-announcer');
  if (existingAnnouncer) {
    existingAnnouncer.textContent = message;
    return;
  }

  const announcer = document.createElement('div');
  announcer.id = 'a11y-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  // Clean up after announcement
  setTimeout(() => {
    announcer.remove();
  }, 1000);
};

/**
 * Trap focus within a container element
 */
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    return () => {};
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Check if an element is visible
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(isElementVisible);
};

/**
 * Set focus to the first focusable element
 */
export const focusFirstElement = (container: HTMLElement): boolean => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
    return true;
  }
  return false;
};

/**
 * Set focus to the last focusable element
 */
export const focusLastElement = (container: HTMLElement): boolean => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
    return true;
  }
  return false;
};

/**
 * Check if an element has a specific ARIA attribute
 */
export const hasAriaAttribute = (element: HTMLElement, attribute: string): boolean => {
  return element.hasAttribute(attribute);
};

/**
 * Get the text content of an element, including aria-label if present
 */
export const getAccessibleText = (element: HTMLElement): string => {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labelledByElement = document.getElementById(ariaLabelledby);
    if (labelledByElement) {
      return labelledByElement.textContent || '';
    }
  }

  return element.textContent || '';
};

/**
 * Check if color contrast meets WCAG AA standards
 */
export const checkColorContrast = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (l1: number, l2: number): number => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  const fgLuminance = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const contrastRatio = getContrastRatio(fgLuminance, bgLuminance);

  if (level === 'AA') {
    return size === 'large' ? contrastRatio >= 3 : contrastRatio >= 4.5;
  } else {
    return size === 'large' ? contrastRatio >= 4.5 : contrastRatio >= 7;
  }
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHTML = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.textContent = html;
  return tempDiv.innerHTML;
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (..._args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((..._args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (..._args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(..._args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (..._args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((..._args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (..._args: Parameters<T>) => {
    if (!inThrottle) {
      func(..._args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Get the current viewport size
 */
export const getViewportSize = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

/**
 * Check if the current device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Check if the current device is a touch device
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get the current scroll position
 */
export const getScrollPosition = (): { x: number; y: number } => {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop
  };
};

/**
 * Scroll to an element smoothly
 */
 
export const scrollToElement = (
  element: HTMLElement,
  options: any = { behavior: 'smooth', block: 'start' }
): void => {
  element.scrollIntoView(options);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    announceToScreenReader('Текст скопирован в буфер обмена');
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    announceToScreenReader('Не удалось скопировать текст');
    return false;
  }
};

/**
 * Format a date for accessibility
 */
export const formatDateForAccessibility = (date: Date): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * Format a number for accessibility
 */
export const formatNumberForAccessibility = (number: number): string => {
  return new Intl.NumberFormat('ru-RU').format(number);
};

/**
 * Format a currency for accessibility
 */
export const formatCurrencyForAccessibility = (amount: number, currency: string = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Get the current language
 */
export const getCurrentLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'ru';
  return navigator.language || 'ru';
};

/**
 * Check if the user is using a screen reader
 */
export const isUsingScreenReader = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for common screen reader indicators
  const speechSynthesis = 'speechSynthesis' in window;
  const speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  return speechSynthesis || speechRecognition;
};

/**
 * Hide an element from screen readers but keep it visible
 */
export const hideFromScreenReaders = (element: HTMLElement): void => {
  element.setAttribute('aria-hidden', 'true');
};

/**
 * Show an element to screen readers
 */
export const showToScreenReaders = (element: HTMLElement): void => {
  element.removeAttribute('aria-hidden');
};
