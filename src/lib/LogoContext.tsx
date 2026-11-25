import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AppSettings } from '../types';
import dmtcOfficialLogo from '../assets/images/dmtc_official_logo.svg';

interface LogoContextType {
  logoURL: string;
  loading: boolean;
  refreshLogo: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const DEFAULT_LOGO = dmtcOfficialLogo;
export const getDefaultLogo = (): string => DEFAULT_LOGO;

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with DEFAULT_LOGO immediately so logo fetches never block first paint
  const [logoURL, setLogoURL] = useState(DEFAULT_LOGO);
  const loading = false;

  const refreshLogo = useCallback(async () => {
    try {
      const snapshot = await getDoc(doc(db, 'settings', 'app'));
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        setLogoURL(data.logoURL || DEFAULT_LOGO);
      } else {
        setLogoURL(DEFAULT_LOGO);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  useEffect(() => {
    void refreshLogo();
  }, [refreshLogo]);

  return (
    <LogoContext.Provider value={{ logoURL, loading, refreshLogo }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = () => {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};
