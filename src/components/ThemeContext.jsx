import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, defaultTheme = 'light' }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('subbito_theme');
    return saved ? saved === 'dark' : defaultTheme === 'dark';
  });

  const theme = {
    isDarkTheme,
    toggleTheme: () => setIsDarkTheme(prev => !prev),
    bgMain: isDarkTheme ? 'bg-gray-900' : 'bg-white',
    bgCard: isDarkTheme ? 'bg-gray-800' : 'bg-white',
    borderCard: isDarkTheme ? 'border-gray-700' : 'border-gray-200',
    bgInput: isDarkTheme ? 'bg-gray-700' : 'bg-gray-50',
    textPrimary: isDarkTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkTheme ? 'text-gray-300' : 'text-gray-600',
    bgSection: isDarkTheme ? 'bg-gray-800' : 'bg-gray-50',
    bgSectionAlt: isDarkTheme ? 'bg-gray-700' : 'bg-gray-100',
    bgBadge: isDarkTheme ? 'bg-blue-900' : 'bg-blue-100'
  };

  useEffect(() => {
    localStorage.setItem('subbito_theme', isDarkTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkTheme);
  }, [isDarkTheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};


