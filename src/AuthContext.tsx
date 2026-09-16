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
import { LoginModal } from './components/LoginModal';
import { saveLocalUser, getLocalUsers } from './lib/localData';

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
  isLoginModalOpen: boolean;
  loginModalTab: 'login' | 'signup';
  openLoginModal: (tab?: 'login' | 'signup') => void;
  closeLoginModal: () => void;
  loginDirect: (email: string, companyName?: string, role?: UserRole, displayName?: string) => void;
  signupDirect: (email: string, displayName?: string, companyName?: string, role?: UserRole) => void;
  login: (tab?: 'login' | 'signup') => void;
  loginWithGooglePopup: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('aquaads_session_user');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'login' | 'signup'>('login');

  // Check for redirect result on load (for mobile / redirect sign-in flows)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.info('Redirect sign-in successful for:', result.user.email);
        }
      })
      .catch((error: any) => {
        const code = error?.code || '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return;
        }
        console.warn('Redirect sign-in notice:', error);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isUserAdmin = isAdminEmail(firebaseUser.email);
        const resolvedUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: isUserAdmin ? 'admin' : 'user',
          companyName: isUserAdmin ? 'AquaAds Operations' : 'Advertiser',
          createdAt: new Date().toISOString(),
        };

        // Immediately set user in state and local storage so zero-database login works
        setUser(resolvedUser);
        localStorage.setItem('aquaads_session_user', JSON.stringify(resolvedUser));
        saveLocalUser(resolvedUser);

        // Optional background sync with Firestore if available
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (isUserAdmin && userData.role !== 'admin') {
              const updatedProfile: UserProfile = { ...userData, role: 'admin' };
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true });
              setUser(updatedProfile);
              localStorage.setItem('aquaads_session_user', JSON.stringify(updatedProfile));
              syncProfileToSupabase(updatedProfile);
            } else {
              setUser(userData);
              localStorage.setItem('aquaads_session_user', JSON.stringify(userData));
              syncProfileToSupabase(userData);
            }
          } else {
            await setDoc(doc(db, 'users', firebaseUser.uid), resolvedUser);
            syncProfileToSupabase(resolvedUser);
          }
        } catch {
          // Graceful fallback when Firestore is unavailable or offline
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Direct login without database
  const loginDirect = (email: string, companyName?: string, role?: UserRole, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isUserAdmin = isAdminEmail(cleanEmail);
    const assignedRole: UserRole = role || (isUserAdmin ? 'admin' : 'user');

    // Try to find if user already exists locally
    const existingUsers = getLocalUsers();
    const matched = existingUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    const profile: UserProfile = {
      uid: matched?.uid || 'user_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 14),
      email: cleanEmail,
      displayName: displayName?.trim() || matched?.displayName || (isUserAdmin ? (cleanEmail.includes('jmi') ? 'Jmi Sagor' : 'Tonmoy Letar') : cleanEmail.split('@')[0]),
      role: assignedRole,
      companyName: companyName?.trim() || matched?.companyName || (assignedRole === 'admin' ? 'AquaAds Leadership' : 'Brand Advertiser'),
      createdAt: matched?.createdAt || new Date().toISOString(),
    };

    localStorage.setItem('aquaads_session_user', JSON.stringify(profile));
    saveLocalUser(profile);
    setUser(profile);
    setIsLoginModalOpen(false);
  };

  // Direct signup without database
  const signupDirect = (email: string, displayName?: string, companyName?: string, role?: UserRole) => {
    const cleanEmail = email.trim().toLowerCase();
    const isUserAdmin = isAdminEmail(cleanEmail);
    const assignedRole: UserRole = role || (isUserAdmin ? 'admin' : 'user');

    const profile: UserProfile = {
      uid: 'user_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 14),
      email: cleanEmail,
      displayName: displayName?.trim() || (isUserAdmin ? (cleanEmail.includes('jmi') ? 'Jmi Sagor' : 'Tonmoy Letar') : cleanEmail.split('@')[0]),
      role: assignedRole,
      companyName: companyName?.trim() || (assignedRole === 'admin' ? 'AquaAds Operations' : 'Brand Advertiser'),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('aquaads_session_user', JSON.stringify(profile));
    saveLocalUser(profile);
    setUser(profile);
    setIsLoginModalOpen(false);
  };

  const openLoginModal = (tab: 'login' | 'signup' = 'login') => {
    setLoginModalTab(tab);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  // Default login action now opens the instant Login Modal
  const login = (tab: 'login' | 'signup' = 'login') => {
    openLoginModal(tab);
  };

  // Google popup login option
  const loginWithGooglePopup = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsLoginModalOpen(false);
    } catch (error: any) {
      const code = error?.code || 'unknown';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }

      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          const redirectCode = redirectError?.code || 'auth/popup-blocked';
          if (redirectCode === 'auth/popup-closed-by-user' || redirectCode === 'auth/cancelled-popup-request') {
            return;
          }
          setAuthError({
            code: redirectCode,
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
      const code = error?.code || 'unknown';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setIsLoggingIn(false);
        return;
      }
      setAuthError({
        code,
        message: error?.message || 'Redirect sign-in failed',
        domain: typeof window !== 'undefined' ? window.location.hostname : '',
      });
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('aquaads_session_user');
      setUser(null);
      await signOut(auth);
    } catch (error) {
      console.warn('Logout notice:', error);
      setUser(null);
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
        isLoginModalOpen,
        loginModalTab,
        openLoginModal,
        closeLoginModal,
        loginDirect,
        signupDirect,
        login,
        loginWithGooglePopup,
        loginWithRedirect,
        logout,
        clearAuthError,
        isAdmin: user?.role === 'admin' || isAdminEmail(user?.email),
      }}
    >
      {children}
      <LoginModal
        isOpen={isLoginModalOpen}
        initialTab={loginModalTab}
        onClose={closeLoginModal}
      />
      <AuthErrorModal
        error={authError}
        onClose={clearAuthError}
        onRetryPopup={loginWithGooglePopup}
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
