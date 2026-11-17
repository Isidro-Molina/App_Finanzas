import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

export interface CachedCategory {
  id: string;
  name: string;
  icon: string | null;
  type: 'INCOME' | 'EXPENSE';
  userId: string | null;
  isHidden?: boolean;
}

interface CategoriesContextValue {
  categories: CachedCategory[];
  loading: boolean;
  refreshCategories: () => Promise<CachedCategory[]>;
  updateCategoriesCache: (
    updater: CachedCategory[] | ((prev: CachedCategory[]) => CachedCategory[]),
  ) => void;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CachedCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const storageKey = user?.id ? `@finova_categories_${user.id}` : null;

  const persist = useCallback(
    async (list: CachedCategory[]) => {
      if (!storageKey) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
      } catch {
        // Silencioso: el cache en memoria sigue activo
      }
    },
    [storageKey],
  );

  const refreshCategories = useCallback(async (): Promise<CachedCategory[]> => {
    if (!user?.id) return [];
    try {
      const res = await apiClient.get<CachedCategory[]>('/categories');
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list);
      void persist(list);
      return list;
    } catch (e) {
      console.error('Error refreshing categories:', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, persist]);

  const updateCategoriesCache = useCallback(
    (updater: CachedCategory[] | ((prev: CachedCategory[]) => CachedCategory[])) => {
      setCategories((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  useEffect(() => {
    if (!user?.id || !storageKey) {
      setCategories([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const bootstrap = async () => {
      let hasCached = false;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
            hasCached = true;
          }
        }
      } catch {
        // Ignorar cache corrupto
      }

      if (!hasCached && !cancelled) {
        setLoading(true);
      }
      await refreshCategories();
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user?.id, storageKey, refreshCategories]);

  return (
    <CategoriesContext.Provider
      value={{ categories, loading, refreshCategories, updateCategoriesCache }}
    >
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = (): CategoriesContextValue => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories debe usarse dentro de un CategoriesProvider');
  }
  return ctx;
};
