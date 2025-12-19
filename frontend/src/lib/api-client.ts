import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Get Firebase ID token for authenticated requests
 * Returns null if user is not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    // Get fresh token (Firebase handles caching and refresh automatically)
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Create headers with authentication token
 */
async function createHeaders(additionalHeaders?: HeadersInit): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Authenticated fetch wrapper
 * Automatically attaches Firebase ID token to requests
 * Supports multi-user concurrent sessions (each user has their own token)
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

  // Handle authentication errors
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    
    // Token expired or invalid - try to refresh
    if (data.code === 'AUTH_TOKEN_EXPIRED' || data.code === 'AUTH_TOKEN_INVALID') {
      console.warn('Auth token expired, attempting refresh...');
      
      // Force token refresh
      const user = auth.currentUser;
      if (user) {
        try {
          await user.getIdToken(true); // Force refresh
          
          // Retry request with new token
          const newHeaders = await createHeaders(options.headers);
          return fetch(url, {
            ...options,
            headers: newHeaders,
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Let the error propagate to trigger re-login
        }
      }
    }
  }

  return response;
}

/**
 * GET request with authentication
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * POST request with authentication
 */
export async function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * PUT request with authentication
 */
export async function apiPut<T = any>(endpoint: string, data?: any): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE request with authentication
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
  });

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
