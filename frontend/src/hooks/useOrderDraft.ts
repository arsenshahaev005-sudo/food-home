/**
 * Custom hook для работы с черновиками заказов.
 * 
 * Обоснование: Устраняет проблему потери данных при заполнении формы заказа.
 * Пользователь может вернуться к оформлению позже и продолжить с того же места.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  OrderDraft,
  OrderDraftFormData,
  getOrderDraft,
  saveOrderDraft,
  updateOrderDraft,
  deleteOrderDraft,
  getMyDrafts,
} from '../lib/api/orderDraftApi';

interface UseOrderDraftOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseOrderDraftReturn {
  drafts: OrderDraft[];
  currentDraft: OrderDraft | null;
  loading: boolean;
  error: string | null;
  loadDrafts: () => Promise<void>;
  loadDraft: (id: string) => Promise<void>; // eslint-disable-line no-unused-vars
  saveDraft: (data: OrderDraftFormData) => Promise<OrderDraft | null>; // eslint-disable-line no-unused-vars
  updateDraft: (id: string, data: Partial<OrderDraftFormData>) => Promise<OrderDraft | null>; // eslint-disable-line no-unused-vars
  removeDraft: (id: string) => Promise<void>; // eslint-disable-line no-unused-vars
  clearCurrentDraft: () => void;
}

export function useOrderDraft(
  token: string | undefined,
  options: UseOrderDraftOptions = {}
): UseOrderDraftReturn {
  const { autoSave = true, autoSaveDelay = 1000 } = options;

  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<OrderDraft | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<OrderDraftFormData | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load all drafts for the user
  const loadDrafts = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getMyDrafts(token);
      setDrafts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке черновиков');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load a specific draft
  const loadDraft = useCallback(async (id: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getOrderDraft(id, token);
      setCurrentDraft(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке черновика');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Save a new draft
  const saveDraft = useCallback(async (data: OrderDraftFormData): Promise<OrderDraft | null> => {
    if (!token) return null;

    setLoading(true);
    setError(null);

    try {
      const savedDraft = await saveOrderDraft(data, token);
      setDrafts((prev: OrderDraft[]) => [...prev, savedDraft]);
      setCurrentDraft(savedDraft);
      return savedDraft;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении черновика');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Update an existing draft
  const updateDraft = useCallback(async (id: string, data: Partial<OrderDraftFormData>): Promise<OrderDraft | null> => {
    if (!token) return null;

    setLoading(true);
    setError(null);

    try {
      const updatedDraft = await updateOrderDraft(id, data, token);
      setDrafts((prev: OrderDraft[]) => prev.map((d: OrderDraft) => (d.id === id ? updatedDraft : d)));
      if (currentDraft?.id === id) {
        setCurrentDraft(updatedDraft);
      }
      return updatedDraft;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при обновлении черновика');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, currentDraft]);

  // Remove a draft
  const removeDraft = useCallback(async (id: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      await deleteOrderDraft(id, token);
      setDrafts((prev: OrderDraft[]) => prev.filter((d: OrderDraft) => d.id !== id));
      if (currentDraft?.id === id) {
        setCurrentDraft(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении черновика');
    } finally {
      setLoading(false);
    }
  }, [token, currentDraft]);

  // Clear current draft
  const clearCurrentDraft = useCallback(() => {
    setCurrentDraft(null);
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !pendingSave || !token) return;

    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(async () => {
      if (currentDraft) {
        await updateDraft(currentDraft.id, pendingSave);
      } else {
        await saveDraft(pendingSave);
      }
      setPendingSave(null);
    }, autoSaveDelay);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [pendingSave, autoSave, autoSaveDelay, token, currentDraft, updateDraft, saveDraft, saveTimeout]);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  return {
    drafts,
    currentDraft,
    loading,
    error,
    loadDrafts,
    loadDraft,
    saveDraft,
    updateDraft,
    removeDraft,
    clearCurrentDraft,
  };
}

export default useOrderDraft;
