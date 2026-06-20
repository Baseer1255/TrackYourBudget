import { useState, useEffect } from 'react';

/**
 * useTheme
 *
 * Manages dark/light mode with three layers of priority:
 *   1. User's saved preference in localStorage  ← highest
 *   2. OS/browser prefers-color-scheme          ← fallback
 *   3. Default: light                           ← last resort
 *
 * Usage:
 *   const { isDarkMode, toggleTheme } = useTheme();
 *
 * Replaces the ad-hoc isDarkMode state + useEffect in App.jsx
 */

const STORAGE_KEY = 'v2-theme';

function getInitialTheme() {
  // 1. Check localStorage first
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // localStorage blocked (private browsing, etc.) — fall through
  }

  // 2. Fall back to system preference
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

  // Sync the .dark class on <html> and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // Silently ignore if localStorage is unavailable
    }
  }, [isDarkMode]);

  // Also listen for OS-level theme changes while the app is open.
  // Only fires if the user hasn't set an explicit preference yet.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      try {
        const hasSavedPreference = localStorage.getItem(STORAGE_KEY) !== null;
        if (!hasSavedPreference) {
          setIsDarkMode(e.matches);
        }
      } catch {
        setIsDarkMode(e.matches);
      }
    };

    mq.addEventListener('change', handleSystemChange);
    return () => mq.removeEventListener('change', handleSystemChange);
  }, []);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // Optionally set theme explicitly (useful for a theme picker)
  const setTheme = (dark) => setIsDarkMode(Boolean(dark));

  return { isDarkMode, toggleTheme, setTheme };
}
