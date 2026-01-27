import React, { useEffect, useRef, useCallback } from 'react';

export interface KeyboardNavigationOptions {
  /**
   * Whether to enable keyboard navigation
   */
  enabled?: boolean;
  /**
   * Callback when Enter key is pressed
   */
  onEnter?: () => void;
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;
  /**
   * Callback when Space key is pressed
   */
  onSpace?: () => void;
  /**
   * Callback when Arrow Up key is pressed
   */
  onArrowUp?: () => void;
  /**
   * Callback when Arrow Down key is pressed
   */
  onArrowDown?: () => void;
  /**
   * Callback when Arrow Left key is pressed
   */
  onArrowLeft?: () => void;
  /**
   * Callback when Arrow Right key is pressed
   */
  onArrowRight?: () => void;
  /**
   * Callback when Home key is pressed
   */
  onHome?: () => void;
  /**
   * Callback when End key is pressed
   */
  onEnd?: () => void;
  /**
   * Callback when Tab key is pressed
   */
  onTab?: (event: KeyboardEvent) => void; // eslint-disable-line no-unused-vars
  /**
   * Callback when any key is pressed
   */
  onKeyDown?: (event: KeyboardEvent) => void; // eslint-disable-line no-unused-vars
  /**
   * Whether to prevent default behavior for handled keys
   */
  preventDefault?: boolean;
}

export interface UseKeyboardNavigationReturn {
  /**
   * Ref to attach to the element
   */
  ref: React.RefObject<HTMLElement>;
  /**
   * Function to manually handle keyboard event
   */
  handleKeyDown: (event: KeyboardEvent) => void; // eslint-disable-line no-unused-vars
  /**
   * Function to set focus to the element
   */
  focus: () => void;
  /**
   * Function to blur the element
   */
  blur: () => void;
}

/**
 * Hook for keyboard navigation
 * Provides keyboard accessibility for interactive elements
 */
export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn => {
  const {
    enabled = true,
    onEnter,
    onEscape,
    onSpace,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onTab,
    onKeyDown,
    preventDefault = true
  } = options;

  const ref = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Call the general onKeyDown callback first
      if (onKeyDown) {
        onKeyDown(event);
      }

      let handled = false;

      switch (event.key) {
        case 'Enter':
          if (onEnter) {
            onEnter();
            handled = true;
          }
          break;
        case 'Escape':
          if (onEscape) {
            onEscape();
            handled = true;
          }
          break;
        case ' ':
          if (onSpace) {
            onSpace();
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            onArrowUp();
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            onArrowDown();
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            onArrowLeft();
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            onArrowRight();
            handled = true;
          }
          break;
        case 'Home':
          if (onHome) {
            onHome();
            handled = true;
          }
          break;
        case 'End':
          if (onEnd) {
            onEnd();
            handled = true;
          }
          break;
        case 'Tab':
          if (onTab) {
            onTab(event);
          }
          break;
      }

      if (handled && preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [
      enabled,
      onEnter,
      onEscape,
      onSpace,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
      onTab,
      onKeyDown,
      preventDefault
    ]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  const focus = useCallback(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const blur = useCallback(() => {
    if (ref.current) {
      ref.current.blur();
    }
  }, []);

  return {
    ref,
    handleKeyDown,
    focus,
    blur
  };
};

export interface UseArrowNavigationOptions {
  /**
   * Array of items to navigate through
   */
  items: HTMLElement[];
  /**
   * Currently selected index
   */
  selectedIndex: number;
  /**
   * Callback when selection changes
   */
  onSelect?: (index: number) => void; // eslint-disable-line no-unused-vars
  /**
   * Whether to loop navigation
   */
  loop?: boolean;
  /**
   * Whether to enable navigation
   */
  enabled?: boolean;
}

/**
 * Hook for arrow key navigation through a list of items
 */
export const useArrowNavigation = (
  options: UseArrowNavigationOptions
): void => {
  const { items, selectedIndex, onSelect, loop = true, enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      let newIndex = selectedIndex;

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          newIndex = selectedIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          newIndex = selectedIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== selectedIndex && onSelect) {
        onSelect(newIndex);
        event.preventDefault();

        // Focus the new item
        if (items[newIndex]) {
          items[newIndex].focus();
        }
      }
    },
    [enabled, items, selectedIndex, onSelect, loop]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
};

export interface UseFocusTrapOptions {
  /**
   * Whether to enable focus trap
   */
  enabled?: boolean;
  /**
   * Callback when focus trap is activated
   */
  onActivate?: () => void;
  /**
   * Callback when focus trap is deactivated
   */
  onDeactivate?: () => void;
}

/**
 * Hook for trapping focus within a container
 */
export const useFocusTrap = (
  options: UseFocusTrapOptions = {}
): React.RefObject<HTMLElement> => {
  const { enabled = true, onActivate, onDeactivate } = options;
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element when trap is activated
    firstElement.focus();
    if (onActivate) onActivate();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (onDeactivate) onDeactivate();
    };
  }, [enabled, onActivate, onDeactivate]);

  return containerRef;
};

export interface UseFocusManagementOptions {
  /**
   * Whether to auto-focus on mount
   */
  autoFocus?: boolean;
  /**
   * Whether to restore focus on unmount
   */
  restoreFocus?: boolean;
}

/**
 * Hook for managing focus state
 */
export const useFocusManagement = (
  options: UseFocusManagementOptions = {}
): React.RefObject<HTMLElement> => {
  const { autoFocus = true, restoreFocus = true } = options;
  const ref = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Auto-focus if enabled
    if (autoFocus) {
      element.focus();
    }

    return () => {
      // Restore focus if enabled
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus]);

  return ref;
};
