import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ThemeContextProvider, useTheme } from './ThemeContext';

// Mock component to test the context
const TestComponent: React.FC = () => {
  const { 
    isDarkMode, 
    themeMode, 
    toggleTheme, 
    setThemeMode, 
    systemPrefersDark 
  } = useTheme();

  return (
    <div>
      <div data-testid="is-dark-mode">{isDarkMode.toString()}</div>
      <div data-testid="theme-mode">{themeMode}</div>
      <div data-testid="system-prefers-dark">{systemPrefersDark.toString()}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button 
        data-testid="set-light" 
        onClick={() => setThemeMode('light')}
      >
        Set Light
      </button>
      <button 
        data-testid="set-dark" 
        onClick={() => setThemeMode('dark')}
      >
        Set Dark
      </button>
      <button 
        data-testid="set-system" 
        onClick={() => setThemeMode('system')}
      >
        Set System
      </button>
    </div>
  );
};

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Legacy method
      removeListener: jest.fn(), // Legacy method
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should default to system theme mode', () => {
    mockMatchMedia(true); // System prefers dark

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
    expect(screen.getByTestId('system-prefers-dark')).toHaveTextContent('true');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');
  });

  it('should detect system light theme preference', () => {
    mockMatchMedia(false); // System prefers light

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    expect(screen.getByTestId('system-prefers-dark')).toHaveTextContent('false');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('false');
  });

  it('should allow manual theme mode setting', () => {
    mockMatchMedia(true);

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    // Set to light mode
    fireEvent.click(screen.getByTestId('set-light'));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('false');

    // Set to dark mode
    fireEvent.click(screen.getByTestId('set-dark'));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');

    // Set back to system
    fireEvent.click(screen.getByTestId('set-system'));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true'); // System prefers dark
  });

  it('should toggle theme correctly from system mode', () => {
    mockMatchMedia(true); // System prefers dark

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    // Initially in system mode (dark)
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');

    // Toggle should switch to light (opposite of system preference)
    fireEvent.click(screen.getByTestId('toggle-theme'));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('false');

    // Toggle again should switch to dark
    fireEvent.click(screen.getByTestId('toggle-theme'));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark-mode')).toHaveTextContent('true');
  });

  it('should persist theme preference in localStorage', () => {
    mockMatchMedia(true);

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    // Set to light mode
    fireEvent.click(screen.getByTestId('set-light'));
    expect(localStorage.getItem('theme-preference')).toBe('light');

    // Set to dark mode
    fireEvent.click(screen.getByTestId('set-dark'));
    expect(localStorage.getItem('theme-preference')).toBe('dark');

    // Set to system mode
    fireEvent.click(screen.getByTestId('set-system'));
    expect(localStorage.getItem('theme-preference')).toBe('system');
  });

  it('should migrate legacy localStorage preferences', () => {
    mockMatchMedia(true);
    
    // Set legacy preference
    localStorage.setItem('theme-preference', 'true');

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    // Should migrate to 'dark' and update localStorage
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme-preference')).toBe('dark');
  });

  it('should handle missing matchMedia gracefully', () => {
    // Remove matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });

    render(
      <ThemeContextProvider>
        <TestComponent />
      </ThemeContextProvider>
    );

    // Should default to dark theme when matchMedia is not available
    expect(screen.getByTestId('system-prefers-dark')).toHaveTextContent('true');
  });
});