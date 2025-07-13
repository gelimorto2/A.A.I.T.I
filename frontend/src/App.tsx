import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from './store/store';
import AppRouter from './components/AppRouter';
import SocketProvider from './contexts/SocketContext';
import './App.css';

// Dark theme for mission-critical interface
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88', // Green for active/positive states
    },
    secondary: {
      main: '#ff3366', // Red for alerts/negative states
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
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#444',
            },
            '&:hover fieldset': {
              borderColor: '#666',
            },
          },
        },
      },
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router>
          <SocketProvider>
            <AppRouter />
          </SocketProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
