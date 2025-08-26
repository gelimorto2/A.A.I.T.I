import { useState, useEffect } from 'react';

interface SetupStatus {
  isSetupComplete: boolean;
  isLoading: boolean;
  needsSetup: boolean;
}

export const useSetupStatus = (): SetupStatus & { 
  markSetupComplete: () => void;
  checkSetupStatus: () => Promise<void>;
} => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkSetupStatus = async () => {
    setIsLoading(true);
    try {
      // Check if setup was completed locally
      const localSetup = localStorage.getItem('aaiti-setup-complete');
      
      // Check server-side setup status
      const response = await fetch('/api/setup/status');
      
      if (response.ok) {
        const serverStatus = await response.json();
        const isComplete = serverStatus.setupComplete || !!localSetup;
        
        setIsSetupComplete(isComplete);
        setNeedsSetup(!isComplete);
      } else {
        // If server doesn't respond or doesn't have setup endpoint,
        // assume we need setup unless local storage says otherwise
        const hasLocalSetup = !!localSetup;
        setIsSetupComplete(hasLocalSetup);
        setNeedsSetup(!hasLocalSetup);
      }
    } catch (error) {
      console.warn('Could not check setup status from server, using local storage');
      const localSetup = localStorage.getItem('aaiti-setup-complete');
      const hasLocalSetup = !!localSetup;
      setIsSetupComplete(hasLocalSetup);
      setNeedsSetup(!hasLocalSetup);
    } finally {
      setIsLoading(false);
    }
  };

  const markSetupComplete = () => {
    setIsSetupComplete(true);
    setNeedsSetup(false);
    
    // Store completion flag
    localStorage.setItem('aaiti-setup-complete', JSON.stringify({
      timestamp: new Date().toISOString(),
      version: '2.1.0'
    }));
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  return {
    isSetupComplete,
    isLoading,
    needsSetup,
    markSetupComplete,
    checkSetupStatus,
  };
};
