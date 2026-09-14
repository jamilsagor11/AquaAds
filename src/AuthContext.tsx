import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  googleProvider,
  doc,
  getDoc,
  setDoc,
} from './firebase';
import { UserProfile, UserRole } from './types';
import { syncProfileToSupabase } from './lib/supabase';
import { AuthErrorModal, AuthErrorInfo } from './components/AuthErrorModal';

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
  isLoggingIn: boolean;
  authError: AuthErrorInfo | null;
  login: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  // Check for redirect result on load (for mobile / redirect sign-in flows)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Redirect sign-in successful for:', result.user.email);
        }
      })
      .catch((error: any) => {
        console.error('Redirect sign-in error:', error);
        if (error?.code) {
          setAuthError({
            code: error.code,
            message: error.message || 'Redirect sign-in failed',
            domain: typeof window !== 'undefined' ? window.location.hostname : '',
          });
        }
      });
  }, []);

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
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed:', error);
      const code = error?.code || 'unknown';

      // If popup was blocked by browser or mobile Safari, try redirect fallback
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          setAuthError({
            code: redirectError?.code || 'auth/popup-blocked',
            message: redirectError?.message || 'Popup was blocked by your browser.',
            domain: typeof window !== 'undefined' ? window.location.hostname : '',
          });
        }
      } else {
        setAuthError({
          code,
          message: error?.message || 'Authentication error',
          domain: typeof window !== 'undefined' ? window.location.hostname : '',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithRedirect = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error('Redirect login failed:', error);
      setAuthError({
        code: error?.code || 'unknown',
        message: error?.message || 'Redirect sign-in failed',
        domain: typeof window !== 'undefined' ? window.location.hostname : '',
      });
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggingIn,
        authError,
        login,
        loginWithRedirect,
        logout,
        clearAuthError,
        isAdmin: user?.role === 'admin' || isAdminEmail(user?.email),
      }}
    >
      {children}
      <AuthErrorModal
        error={authError}
        onClose={clearAuthError}
        onRetryPopup={login}
        onRetryRedirect={loginWithRedirect}
      />
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
