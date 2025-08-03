import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from './store/store';
import AppRouter from './components/AppRouter';
import SocketProvider from './contexts/SocketContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <ThemeContextProvider>
        <Router>
          <SocketProvider>
            <AppRouter />
          </SocketProvider>
        </Router>
      </ThemeContextProvider>
    </Provider>
  );
}

export default App;
