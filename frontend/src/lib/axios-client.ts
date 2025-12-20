'use client';

import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { auth } from './firebase';

// Extend Window interface for global auth state
declare global {
  interface Window {
    __authReady: boolean;
    __authReadyPromise: Promise<boolean> | null;
    __authReadyResolve: ((value: boolean) => void) | null;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Initialize global auth state (client-side only)
if (typeof window !== 'undefined') {
  if (window.__authReadyPromise === undefined) {
    window.__authReady = false;
    window.__authReadyResolve = null;
    window.__authReadyPromise = new Promise<boolean>((resolve) => {
      window.__authReadyResolve = resolve;
    });
  }
}

/**
 * Mark auth as ready - called by AuthProvider after onAuthStateChanged fires
 */
export function markAuthReady(): void {
  if (typeof window !== 'undefined') {
    window.__authReady = true;
    if (window.__authReadyResolve) {
      window.__authReadyResolve(true);
    }
  }
}

/**
 * Check if auth is ready synchronously
 */
export function isAuthReady(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__authReady === true;
}

/**
 * Wait for auth to be ready - returns a promise that resolves when auth is initialized
 */
export async function waitForAuthReady(): Promise<boolean> {
  if (typeof window === 'undefined') {
    // Server-side: reject immediately
    return Promise.reject(new Error('Cannot wait for auth on server'));
  }
  
  if (window.__authReady) {
    return true;
  }
  
  if (window.__authReadyPromise) {
    return window.__authReadyPromise;
  }
  
  // Fallback: poll for auth ready
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.__authReady) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 50);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 10000);
  });
}

/**
 * Get fresh Firebase ID token
 * Returns null if no user is logged in
 */
async function getFirebaseToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    // Always get fresh token (true = force refresh)
    return await user.getIdToken(true);
  } catch (error) {
    console.error('[axios-client] Failed to get Firebase token:', error);
    return null;
  }
}

// Create single Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - adds Authorization header
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Skip auth for public endpoints
    if (config.url?.includes('/public/') || config.url?.includes('/health')) {
      console.log('[axios-client] Public endpoint, skipping auth:', config.url);
      return config;
    }

    // Only run on client
    if (typeof window === 'undefined') {
      console.warn('[axios-client] Request interceptor called on server - skipping auth');
      return config;
    }

    // Wait for auth to be ready before making authenticated requests
    const authIsReady = isAuthReady();
    console.log('[axios-client] Auth ready status:', authIsReady, 'for URL:', config.url);
    
    if (!authIsReady) {
      console.warn('[axios-client] Auth not ready yet, waiting...');
      try {
        await waitForAuthReady();
        console.log('[axios-client] Auth is now ready');
      } catch (error) {
        console.error('[axios-client] Auth ready timeout:', error);
      }
    }

    // Get token from current user
    const user = auth.currentUser;
    console.log('[axios-client] Current user:', user ? `${user.email} (${user.uid})` : 'null');
    
    if (user) {
      try {
        const token = await user.getIdToken(false); // Use cached token first
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[axios-client] ✅ Token attached to request:', config.url);
        } else {
          console.error('[axios-client] ❌ Token is null for user:', user.email);
        }
      } catch (error) {
        console.error('[axios-client] ❌ Failed to get token:', error);
      }
    } else {
      console.warn('[axios-client] ⚠️ No auth user for request:', config.url);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[axios-client] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles 401 errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;

    // Handle 401 Unauthorized
    if (status === 401) {
      // Check if user is actually logged in
      const user = auth.currentUser;
      
      // Only logout if:
      // 1. Auth is ready (not in bootstrap phase)
      // 2. User is actually logged in (has a valid session)
      // 3. Token refresh failed (backend rejected the token)
      if (isAuthReady() && user) {
        console.error('[axios-client] 401 Unauthorized with valid user - token may be invalid');
        
        // Try to refresh the token once before logging out
        try {
          const freshToken = await user.getIdToken(true);
          if (freshToken) {
            console.log('[axios-client] Token refreshed successfully, retry the request');
            // Don't logout - let the request retry with new token
            return Promise.reject(error);
          }
        } catch (tokenError) {
          console.error('[axios-client] Token refresh failed - logging out:', tokenError);
          try {
            await auth.signOut();
          } catch (signOutError) {
            console.error('[axios-client] Failed to sign out:', signOutError);
          }
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else if (!user) {
        console.warn('[axios-client] 401 but no user logged in - redirecting to login');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        console.warn('[axios-client] 401 before auth ready - ignoring (bootstrap phase)');
      }
    }

    // Log other errors
    if (status !== 401) {
      console.error(`[axios-client] API error ${status} for ${url}:`, error.message);
    }

    return Promise.reject(error);
  }
);

// Export the configured instance
export const axiosClient = axiosInstance;
