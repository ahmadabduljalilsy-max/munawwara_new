import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'supervisor' | 'readonly' | 'user' | 'pending';
  approved: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAILS = ['ahmad.abduljalil.sy@gmail.com', 'ahmad.abduljalilmunawwara@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (unsubSnapshot) {
          unsubSnapshot();
          unsubSnapshot = null;
        }

        setUser(user);
        if (user) {
          // Try to get profile
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // Create a pending profile for new users (or admin for designated super admin emails)
            const isSuperAdmin = ADMIN_EMAILS.includes(user.email || '');
            const newProfile: AppUser = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: isSuperAdmin ? 'admin' : 'pending',
              approved: isSuperAdmin, // Approval required for normal users
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          } else {
            // Set initial profile
            const currentProfile = userDoc.data() as AppUser;
            
            // AUTO-FIX: If this is the super admin and they are not approved/admin, fix it
            if (ADMIN_EMAILS.includes(user.email || '')) {
              if (!currentProfile.approved || currentProfile.role !== 'admin') {
                console.log('Detected super admin in incorrect state, auto-fixing...');
                const updatedProfile = { ...currentProfile, role: 'admin', approved: true };
                await setDoc(userDocRef, updatedProfile, { merge: true });
                setProfile(updatedProfile as any);
              } else {
                setProfile(currentProfile);
              }
            } else {
              setProfile(currentProfile);
            }

            // Listen for profile changes
            unsubSnapshot = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                const data = doc.data() as AppUser;
                // Double safety for super admin
                if (ADMIN_EMAILS.includes(user.email || '') && (data.role !== 'admin' || !data.approved)) {
                  setProfile({ ...data, role: 'admin', approved: true });
                } else {
                  setProfile(data);
                }
              }
            }, (error) => {
              console.error('Snapshot error:', error);
            });
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth sync error:', error);
      } finally {
        setLoading(false);
      }
    });

    // Safety timeout to ensure loading doesn't stay true forever
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
