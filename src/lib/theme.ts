'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'emplacc-theme';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function currentTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light') {
    return 'light';
  }
  if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-theme')) {
    return 'dark';
  }
  return getStoredTheme() ?? systemTheme();
}

export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

// Хук для переключателя темы. Дефолт 'dark' на сервере; реальная тема считывается после монтирования.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => { setTheme(currentTheme()); }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, []);

  const set = useCallback((t: Theme) => { applyTheme(t); setTheme(t); }, []);

  return { theme, toggle, set };
}
