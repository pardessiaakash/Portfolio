/**
 * api.js
 * 
 * Centralized API client for the chatbot backend.
 * All fetch calls go through here to keep components clean.
 */

const RAW_URL = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');

// The backend address comes from the host's environment. A localhost address
// only works on the developer's own machine, so on the live site it counts as
// "no backend": requests fail fast with a friendly error instead of waiting
// on a connection that can never succeed.
const isLocalUrl = (u) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(u);
const onLocalPage = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const BASE_URL = RAW_URL && (!isLocalUrl(RAW_URL) || onLocalPage) ? RAW_URL : null;

export const backendAvailable = () => !!BASE_URL;

export class OfflineError extends Error {
  constructor() { super('offline'); this.name = 'OfflineError'; this.offline = true; }
}

// fetch with a timeout; network failures become OfflineError
async function request(path, options = {}, timeoutMs = 20000) {
  if (!BASE_URL) throw new OfflineError();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${BASE_URL}${path}`, { ...options, signal: ctrl.signal });
  } catch (e) {
    throw new OfflineError();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/v1/chat/
 * 
 * @param {string} query - User's message
 * @param {string} mode  - "ai" (global) or "web" (project-specific)
 * @param {string|null} projectId - Required when mode="web"
 * @returns {Promise<{answer: string, sources: Array, mode: string, project_id: string}>}
 */
export async function sendChatMessage(query, mode = 'ai', projectId = null) {
  const body = {
    query,
    mode,
    ...(projectId ? { project_id: projectId } : {}),
  };

  const response = await request(`/api/v1/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData.error || errData.detail || `Chat request failed (${response.status})`
    );
  }

  return response.json();
}

/**
 * POST /api/v1/speech-to-text/
 * 
 * @param {Blob} audioBlob - Recorded audio blob from MediaRecorder
 * @param {string} filename - Filename hint (e.g., 'recording.webm')
 * @returns {Promise<{transcript: string, provider: string}>}
 */
export async function transcribeAudio(audioBlob, filename = 'recording.webm') {
  const formData = new FormData();
  formData.append('audio', audioBlob, filename);

  const response = await request(`/api/v1/speech-to-text/`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type — browser sets it automatically with boundary
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Transcription failed (${response.status})`);
  }

  return response.json();
}

/**
 * GET /api/v1/health/
 *
 * @returns {Promise<{status: string, llm_provider: string, message: string}>}
 */
export async function checkHealth() {
  const response = await request(`/api/v1/health/`, {}, 8000);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

/**
 * POST /api/v1/ingest/
 *
 * Ingest documents into ChromaDB (used for testing/admin).
 * @param {Array} documents - Array of {project_id, content, title, image_url}
 */
export async function ingestDocuments(documents) {
  const response = await request(`/api/v1/ingest/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Ingestion failed (${response.status})`);
  }

  return response.json();
}

/**
 * GET /api/categories/
 * 
 * Fetch all project categories.
 * @returns {Promise<Array<string>>}
 */
export async function fetchCategories() {
  const response = await request(`/api/categories/`, {}, 8000);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch categories (${response.status})`);
  }
  
  return response.json();
}

/**
 * Fetch projects for a specific category.
 * @param {string} category
 * @returns {Promise<Array<object>>}
 */
export async function fetchProjects(category) {
  const response = await request(`/api/projects/?category=${encodeURIComponent(category)}`, {}, 8000);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch projects (${response.status})`);
  }
  
  return response.json();
}
