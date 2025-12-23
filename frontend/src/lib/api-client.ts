'use client';

import { axiosClient, waitForAuthReady, isAuthReady } from './axios-client';

/**
 * Wrapper for API requests that ensures auth is ready before proceeding
 * This prevents API calls during SSR and before Firebase auth is initialized
 */
async function withAuthReady<T>(fn: () => Promise<T>): Promise<T> {
  // Only run on client
  if (typeof window === 'undefined') {
    throw new Error('API calls cannot be made during SSR');
  }
  
  // Wait for auth to be ready before making the request
  const ready = await waitForAuthReady();
  if (!ready) {
    throw new Error('Auth initialization timed out');
  }
  
  return fn();
}

/**
 * GET request with authentication
 * Waits for auth to be ready before making the request
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return withAuthReady(async () => {
    const response = await axiosClient.get<T>(endpoint);
    return response.data;
  });
}

/**
 * POST request with authentication
 * Waits for auth to be ready before making the request
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  return withAuthReady(async () => {
    const response = await axiosClient.post<T>(endpoint, data);
    return response.data;
  });
}

/**
 * PUT request with authentication
 * Waits for auth to be ready before making the request
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  return withAuthReady(async () => {
    const response = await axiosClient.put<T>(endpoint, data);
    return response.data;
  });
}

/**
 * DELETE request with authentication
 * Waits for auth to be ready before making the request
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return withAuthReady(async () => {
    const response = await axiosClient.delete<T>(endpoint);
    return response.data || ({} as T);
  });
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

export async function fetchSyncPerformanceData(snapshotId?: string) {
  const params = new URLSearchParams();
  if (snapshotId) params.append('snapshotId', snapshotId);

  return apiGet(`/api/sync-performance?${params.toString()}`);
}

export async function fetchLatestSyncPerformanceFetch() {
  return apiPost('/api/sync-performance/fetch');
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
