'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, signIn, signOut } from '@/lib/firebase';
import { markAuthReady } from '@/lib/axios-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthChange((firebaseUser) => {
      console.log('[AuthProvider] 🔐 Auth state changed:', {
        user: firebaseUser ? firebaseUser.email : 'null',
        uid: firebaseUser?.uid,
        emailVerified: firebaseUser?.emailVerified,
      });
      
      setUser(firebaseUser);
      setLoading(false);
      setAuthReady(true);
      
      // Mark auth as ready for API client
      // This resolves the global authReady promise
      markAuthReady();
      
      console.log('[AuthProvider] ✅ Auth marked as ready');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
