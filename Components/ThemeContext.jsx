import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('subbito_theme') : null;
    return saved === null ? true : saved === 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('subbito_theme', isDarkTheme ? 'dark' : 'light');
    }
  }, [isDarkTheme]);

  const value = {
    isDarkTheme,
    setIsDarkTheme,
    bgMain: isDarkTheme ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    bgCard: isDarkTheme ? 'bg-slate-800/50' : 'bg-white/80',
    borderCard: isDarkTheme ? 'border-slate-700' : 'border-gray-200',
    bgInput: isDarkTheme ? 'bg-slate-900/50 border-slate-600' : 'bg-gray-50 border-gray-300',
    textPrimary: isDarkTheme ? 'text-white' : 'text-slate-900',
    textSecondary: isDarkTheme ? 'text-slate-400' : 'text-slate-600'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;

