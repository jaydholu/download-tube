import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} className="text-brand-500" /> : <Moon size={18} className="text-surface-600" />}
    </button>
  );
}
