import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dt-theme');

      if (stored)
        return stored === 'dark';

      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark-body', dark);
    localStorage.setItem('dt-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}
