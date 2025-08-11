import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  theme: Theme;
  systemPrefersDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

// Hook to detect system theme preference
const useSystemTheme = () => {
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default to dark for trading interfaces
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (event: MediaQueryListEvent) => {
        setSystemPrefersDark(event.matches);
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } 
      // Legacy browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, []);

  return systemPrefersDark;
};

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const systemPrefersDark = useSystemTheme();
  
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-preference');
    // Migrate old boolean preferences to new system
    if (saved === 'true' || saved === 'false') {
      const mode = saved === 'true' ? 'dark' : 'light';
      localStorage.setItem('theme-preference', mode);
      return mode;
    }
    return (saved as ThemeMode) || 'system'; // Default to system detection
  });

  // Calculate actual theme based on mode and system preference
  const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  useEffect(() => {
    localStorage.setItem('theme-preference', themeMode);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'system') return systemPrefersDark ? 'light' : 'dark';
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  }, [systemPrefersDark]);

  const setThemeModeCallback = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  // Enhanced dark theme for mission-critical interface
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#00ff88', // Green for active/positive states
        light: '#33ff99',
        dark: '#00cc66',
      },
      secondary: {
        main: '#ff3366', // Red for alerts/negative states
        light: '#ff5577',
        dark: '#cc1144',
      },
      background: {
        default: '#0a0a0a',
        paper: '#1a1a1a',
      },
      text: {
        primary: '#ffffff',
        secondary: '#cccccc',
      },
      warning: {
        main: '#ffaa00', // Orange for warnings
      },
      info: {
        main: '#00aaff', // Blue for info
      },
      success: {
        main: '#00ff88',
      },
      error: {
        main: '#ff3366',
      }
    },
    typography: {
      fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      }
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              borderColor: '#555',
              boxShadow: '0 4px 8px rgba(0, 255, 136, 0.1)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              transition: 'border-color 0.2s ease-in-out',
              '& fieldset': {
                borderColor: '#444',
              },
              '&:hover fieldset': {
                borderColor: '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00ff88',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
    },
  });

  // Enhanced light theme for daytime trading
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#2e7d32', // Green for active/positive states
        light: '#4caf50',
        dark: '#1b5e20',
      },
      secondary: {
        main: '#d32f2f', // Red for alerts/negative states
        light: '#f44336',
        dark: '#b71c1c',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#1a1a1a',
        secondary: '#666666',
      },
      warning: {
        main: '#ed6c02', // Orange for warnings
      },
      info: {
        main: '#0288d1', // Blue for info
      },
      success: {
        main: '#2e7d32',
      },
      error: {
        main: '#d32f2f',
      }
    },
    typography: {
      fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      }
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              borderColor: '#c0c0c0',
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              transition: 'border-color 0.2s ease-in-out',
              '& fieldset': {
                borderColor: '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: '#bdbdbd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#2e7d32',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
    },
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    isDarkMode,
    themeMode,
    toggleTheme,
    setThemeMode: setThemeModeCallback,
    theme,
    systemPrefersDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};