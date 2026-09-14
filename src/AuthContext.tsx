import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, signInWithPopup, signOut, googleProvider, doc, getDoc, setDoc } from './firebase';
import { UserProfile, UserRole } from './types';
import { syncProfileToSupabase } from './lib/supabase';

export const ADMIN_EMAILS: string[] = [
  'jmisagor079@gmail.com',
  'tonmoyletar@gmail.com',
];

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === email.toLowerCase().trim());
};

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isUserAdmin = isAdminEmail(firebaseUser.email);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (isUserAdmin && userData.role !== 'admin') {
              const updatedProfile: UserProfile = { ...userData, role: 'admin' };
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true });
              setUser(updatedProfile);
              syncProfileToSupabase(updatedProfile);
            } else {
              setUser(userData);
              syncProfileToSupabase(userData);
            }
          } else {
            // Create new user profile
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: isUserAdmin ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            syncProfileToSupabase(newUser);
          }
        } catch (error) {
          console.warn('Could not fetch user profile from Firestore, using auth fallback:', error);
          const fallbackUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: isUserAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
          };
          setUser(fallbackUser);
          syncProfileToSupabase(fallbackUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'admin' || isAdminEmail(user?.email),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
