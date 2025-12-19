const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchStats(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`${API_BASE_URL}/api/stats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchDefaultRange() {
  const res = await fetch(`${API_BASE_URL}/api/stats/defaults`);
  if (!res.ok) throw new Error('Failed to fetch default range');
  return res.json();
}

export async function fetchRftData(snapshotId?: string) {
  const params = new URLSearchParams();
  if (snapshotId) params.append('snapshotId', snapshotId);

  const res = await fetch(`${API_BASE_URL}/api/rft?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch RFT data');
  return res.json();
}

export async function fetchLatestRftFetch() {
    const res = await fetch(`${API_BASE_URL}/api/rft/fetch`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger RFT fetch');
    return res.json();
}

export async function fetchNotes(snapshotId: string) {
  const params = new URLSearchParams();
  params.append('snapshotId', snapshotId);

  const res = await fetch(`${API_BASE_URL}/api/notes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function createNote(snapshotId: string, noteType: string, content: string) {
  const res = await fetch(`${API_BASE_URL}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotId, noteType, content }),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(noteId: string, content: string) {
  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function deleteNote(noteId: string) {
  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete note');
  return res.json();
}

export async function fetchLiveStats() {
  const res = await fetch(`${API_BASE_URL}/api/live-stats`);
  if (!res.ok) throw new Error('Failed to fetch live stats');
  return res.json();
}

export async function refreshLiveStats() {
  const res = await fetch(`${API_BASE_URL}/api/live-stats/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh live stats');
  return res.json();
}
