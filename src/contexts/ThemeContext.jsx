import PropTypes from 'prop-types';
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Theme options: 'auto', 'light', 'dark'
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved preference
    const savedTheme = localStorage.getItem('hyperweaver-theme');
    return savedTheme || 'auto';
  });

  // Apply theme to HTML element
  useEffect(() => {
    const html = document.documentElement;

    if (theme === 'auto') {
      // For auto mode, follow the system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-bs-theme', theme);
    }

    // Save preference
    localStorage.setItem('hyperweaver-theme', theme);

    // Listen for system theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = e => {
        html.setAttribute('data-bs-theme', e.matches ? 'dark' : 'light');
      };

      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    return undefined;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'auto') {
        return 'light';
      }
      if (current === 'light') {
        return 'dark';
      }
      return 'auto';
    });
  };

  const setSpecificTheme = newTheme => {
    if (['auto', 'light', 'dark'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  const getThemeDisplay = () => {
    if (theme === 'auto') {
      // Check if system prefers dark mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return `Auto (${prefersDark ? 'Dark' : 'Light'})`;
    }
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  const value = {
    theme,
    setTheme: setSpecificTheme,
    toggleTheme,
    getThemeDisplay,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

ThemeProvider.propTypes = {
  children: PropTypes.node,
};
