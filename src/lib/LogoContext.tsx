import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';

interface LogoContextType {
  logoURL: string;
  loading: boolean;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

const DEFAULT_LOGO = "/artifact/5567c9fe-a90f-48d6-96df-71a74d533423";

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoURL, setLogoURL] = useState(DEFAULT_LOGO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        if (data.logoURL) {
          setLogoURL(data.logoURL);
        } else {
          setLogoURL(DEFAULT_LOGO);
        }
      } else {
        setLogoURL(DEFAULT_LOGO);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching settings:", error);
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <LogoContext.Provider value={{ logoURL, loading }}>
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
