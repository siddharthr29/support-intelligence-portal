import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Get Firebase ID token for authenticated requests
 * Returns null if user is not authenticated
 * Always gets fresh token to avoid caching issues
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    // Force fresh token (no caching) to ensure backend can verify
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Create headers with authentication token
 */
async function createHeaders(additionalHeaders?: HeadersInit): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge additional headers
  if (additionalHeaders) {
    if (additionalHeaders instanceof Headers) {
      additionalHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(additionalHeaders)) {
      additionalHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, additionalHeaders);
    }
  }

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Authenticated fetch wrapper
 * Automatically attaches Firebase ID token to requests
 * Forces logout on 401 to prevent retry loops
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = await createHeaders(options.headers);
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle authentication errors - ONLY LOGOUT IF AUTH IS READY
  if (response.status === 401) {
    // Check if Firebase auth is fully initialized
    const isAuthReady = (window as any).__authReady === true;
    
    if (isAuthReady) {
      console.error('Authentication failed (401). Forcing logout...');
      
      // Immediately sign out to clear invalid session
      try {
        await auth.signOut();
        console.log('User signed out due to authentication failure');
      } catch (error) {
        console.error('Failed to sign out:', error);
      }
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else {
      console.warn('Authentication failed (401) but auth not ready - ignoring to prevent premature logout');
    }
    
    // Return the 401 response (no retry)
    return response;
  }

  return response;
}

/**
 * GET request with authentication
 * Throws on non-2xx responses (except 401 which redirects to login)
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });

  // 401 already handled by authenticatedFetch (logout + redirect)
  if (response.status === 401) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * POST request with authentication
 * Throws on non-2xx responses (except 401 which redirects to login)
 */
export async function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  // 401 already handled by authenticatedFetch (logout + redirect)
  if (response.status === 401) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * PUT request with authentication
 * Throws on non-2xx responses (except 401 which redirects to login)
 */
export async function apiPut<T = any>(endpoint: string, data?: any): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  // 401 already handled by authenticatedFetch (logout + redirect)
  if (response.status === 401) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE request with authentication
 * Throws on non-2xx responses (except 401 which redirects to login)
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
  });

  // 401 already handled by authenticatedFetch (logout + redirect)
  if (response.status === 401) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Legacy API functions - updated to use authenticated fetch
export async function fetchStats(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return apiGet(`/api/stats?${params.toString()}`);
}

export async function fetchDefaultRange() {
  return apiGet('/api/stats/defaults');
}

export async function fetchRftData(snapshotId?: string) {
  const params = new URLSearchParams();
  if (snapshotId) params.append('snapshotId', snapshotId);

  return apiGet(`/api/rft?${params.toString()}`);
}

export async function fetchLatestRftFetch() {
  return apiPost('/api/rft/fetch');
}

export async function fetchNotes(snapshotId: string) {
  const params = new URLSearchParams();
  params.append('snapshotId', snapshotId);

  return apiGet(`/api/notes?${params.toString()}`);
}

export async function createNote(snapshotId: string, noteType: string, content: string) {
  return apiPost('/api/notes', { snapshotId, noteType, content });
}

export async function updateNote(noteId: string, content: string) {
  return apiPut(`/api/notes/${noteId}`, { content });
}

export async function deleteNote(noteId: string) {
  return apiDelete(`/api/notes/${noteId}`);
}

export async function fetchLiveStats() {
  return apiGet('/api/live-stats');
}

export async function refreshLiveStats() {
  return apiPost('/api/live-stats/refresh');
}
