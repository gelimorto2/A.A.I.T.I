import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from './store/store';
import AppRouter from './components/AppRouter';
import SocketProvider from './contexts/SocketContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { RBACProvider } from './contexts/RBACContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { SetupProvider } from './contexts/SetupContext';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <ThemeContextProvider>
        <Router>
          <SetupProvider>
            <SocketProvider>
              <RBACProvider>
                <ActivityProvider>
                  <UserPreferencesProvider>
                    <AppRouter />
                  </UserPreferencesProvider>
                </ActivityProvider>
              </RBACProvider>
            </SocketProvider>
          </SetupProvider>
        </Router>
      </ThemeContextProvider>
    </Provider>
  );
}

export default App;
