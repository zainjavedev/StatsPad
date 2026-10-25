'use client';
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/* The app header's light/dark switch, for the server-rendered pages. The page's own script has already set data-theme. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'dark'); }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('statspad-theme', next); } catch { /* private mode */ }
    setTheme(next);
  };
  return <button className="theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>;
}
