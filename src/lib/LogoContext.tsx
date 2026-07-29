import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';

interface LogoContextType {
  logoURL: string;
  loading: boolean;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const getDefaultLogo = (): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e4d2b';
      ctx.beginPath();
      ctx.arc(80, 80, 75, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('درة المنورة', 80, 80);
      return canvas.toDataURL('image/png');
    }
  } catch (e) {
    console.error("Error generating default PNG logo:", e);
  }
  return '';
};

export const DEFAULT_LOGO = getDefaultLogo();

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
