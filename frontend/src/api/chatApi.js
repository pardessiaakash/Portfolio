/**
 * api.js
 * 
 * Centralized API client for the chatbot backend.
 * All fetch calls go through here to keep components clean.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

  const response = await fetch(`${BASE_URL}/api/v1/chat/`, {
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

  const response = await fetch(`${BASE_URL}/api/v1/speech-to-text/`, {
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
  const response = await fetch(`${BASE_URL}/api/v1/health/`);
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
  const response = await fetch(`${BASE_URL}/api/v1/ingest/`, {
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
  const response = await fetch(`${BASE_URL}/api/categories/`);
  
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
  const response = await fetch(`${BASE_URL}/api/projects/?category=${encodeURIComponent(category)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch projects (${response.status})`);
  }
  
  return response.json();
}
