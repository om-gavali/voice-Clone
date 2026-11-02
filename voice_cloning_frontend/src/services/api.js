/**
 * API service for interacting with the Django Voice Cloning backend (IndicF5).
 * Conforms precisely to BACKEND_DOCUMENTATION.md.
 */

import { VoiceCloneError, classifyError, ErrorCategory } from '../utils/errors';

export const DEFAULT_API_BASE = 'http://127.0.0.1:8000';

/** 
 * Synthesis request timeout in milliseconds.
 * Set to 600s (10 minutes) to accommodate IndicF5's cold-start and long-text CPU inference.
 */
const CLONE_TIMEOUT_MS = 600_000;
/** Timeout for lightweight metadata requests */
const META_TIMEOUT_MS = 8_000;

/**
 * Fetches all available professional tone presets from the backend.
 * Endpoint: GET /voice/tones/
 *
 * @param {string} [apiBaseUrl]
 * @returns {Promise<{ tones: Array }>}
 */
export async function fetchTones(apiBaseUrl = DEFAULT_API_BASE) {
  const isLocal = isLocalhostBackend(apiBaseUrl);
  const endpoint = isLocal ? '/voice/tones/' : `${apiBaseUrl.replace(/\/+$/, '')}/voice/tones/`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), META_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, { method: 'GET', signal: controller.signal });
    if (!response.ok) {
      throw new VoiceCloneError(
        `Failed to load tone presets (HTTP ${response.status}).`,
        ErrorCategory.SERVER
      );
    }
    return await response.json();
  } catch (err) {
    throw classifyError(err, 'fetchTones');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Converts a base64 encoded audio string into an in-memory Blob URL for HTML5 Audio playback.
 * Matches the specification in Section 6 and Section 13 of BACKEND_DOCUMENTATION.md.
 * 
 * @param {string} base64String - Base64 encoded audio payload
 * @param {string} [format='wav'] - Audio format (e.g. 'wav', 'mp3')
 * @returns {{ audioUrl: string, blob: Blob }}
 */
export function base64ToBlobUrl(base64String, format = 'wav') {
  if (!base64String) {
    throw new Error('Base64 audio string is empty.');
  }

  // Remove potential data URI header (e.g. data:audio/wav;base64,)
  const cleanBase64 = base64String.replace(/^data:audio\/[a-z0-9]+;base64,/i, '').trim();

  try {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const mimeType = `audio/${format || 'wav'}`;
    const blob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);

    return { audioUrl, blob };
  } catch (err) {
    console.error('Failed to decode base64 audio:', err);
    throw new Error('Failed to decode audio data returned from the backend.');
  }
}

/**
 * Checks if the configured backend URL is localhost/127.0.0.1
 */
function isLocalhostBackend(url) {
  if (!url) return true;
  return (
    url.includes('127.0.0.1:8000') ||
    url.includes('localhost:8000') ||
    url === '/' ||
    url === ''
  );
}

/**
 * Sends reference audio, reference text, and target text to the Django backend.
 * 
 * @param {Object} params
 * @param {File} params.referenceAudio - Audio file defining the reference voice style
 * @param {string} params.referenceText - Transcript matching reference audio
 * @param {string} params.targetText - Target speech text to clone into
 * @param {string} [params.language] - Language code for IndicF5
 * @param {number} [params.speed=1.0] - Speech speed (0.3 – 2.5)
 * @param {string} [params.tone='neutral'] - Professional tone preset id
 * @param {number} [params.pitchShift=0.0] - Semitone pitch shift (-6 to +6)
 * @param {number} [params.cfgStrength] - Classifier-free guidance scale (1.0 – 3.5)
 * @param {string} [params.apiBaseUrl] - Base URL of the Django backend
 * @returns {Promise<{ audioUrl: string, blob?: Blob, audioFormat: string, audioSizeBytes?: number, message?: string, tone?: string, toneName?: string, speed?: number, cfgStrength?: number }>}
 */
export async function cloneVoice({ referenceAudio, referenceText, targetText, language, speed, tone, pitchShift, cfgStrength, apiBaseUrl = DEFAULT_API_BASE }) {
  if (!referenceAudio) {
    throw new Error('Please select or upload a reference audio file.');
  }
  if (!referenceText || !referenceText.trim()) {
    throw new Error('Please enter the reference text corresponding to the audio clip.');
  }
  if (!targetText || !targetText.trim()) {
    throw new Error('Please enter the target text to generate in the cloned voice.');
  }

  // Security: only allow http:// and https:// backend URLs.
  const resolvedBase = (apiBaseUrl || '').trim();
  if (resolvedBase && resolvedBase !== '/' && !/^https?:\/\//i.test(resolvedBase)) {
    throw new VoiceCloneError(
      `Invalid backend URL scheme. Only http:// and https:// are allowed. Got: "${resolvedBase}"`,
      ErrorCategory.VALIDATION,
      'Update the backend URL in the header to start with http:// or https://'
    );
  }

  const formData = new FormData();

  formData.append('reference_audio', referenceAudio);
  formData.append('reference_text', referenceText.trim());
  formData.append('target_text', targetText.trim());
  // Include language code if provided (IndicF5 supports 11 Indian languages)
  if (language) {
    formData.append('language', language);
  }
  // Optional synthesis controls (Section 5 of BACKEND_DOCUMENTATION.md)
  if (speed !== undefined && speed !== null) {
    formData.append('speed', speed);
  }
  if (tone) {
    formData.append('tone', tone);
  }
  if (pitchShift !== undefined && pitchShift !== null) {
    formData.append('pitch_shift', pitchShift);
  }
  if (cfgStrength !== undefined && cfgStrength !== null) {
    formData.append('cfg_strength', cfgStrength);
  }

  // Use relative endpoint '/voice/clone/' for localhost to leverage Vite's dev proxy (bypasses CORS).
  // NOTE: In production (after `vite build`) there is no Vite proxy.
  // Set VITE_API_BASE_URL (e.g. http://your-server:8000) in your .env.production so that
  // DEFAULT_API_BASE resolves to an absolute URL and the relative branch is never taken in prod.
  const isLocal = isLocalhostBackend(apiBaseUrl);
  const primaryEndpoint = isLocal ? '/voice/clone/' : `${apiBaseUrl.replace(/\/+$/, '')}/voice/clone/`;
  // Fallback: if the Vite proxy path fails, hit the backend directly at its absolute URL.
  const fallbackEndpoint = isLocal
    ? `${DEFAULT_API_BASE}/voice/clone/`
    : `${apiBaseUrl.replace(/\/+$/, '')}/voice/clone/`;

  // AbortController for timeout and external cancellation support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Voice synthesis timed out after ${CLONE_TIMEOUT_MS / 1000}s. The server is still processing or under heavy load.`));
  }, CLONE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(primaryEndpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    // If Vite proxy returned 502/503/504 Bad Gateway, try fallback direct endpoint immediately
    if (!response.ok && [502, 503, 504].includes(response.status) && primaryEndpoint !== fallbackEndpoint) {
      console.warn(`Primary proxy endpoint [${primaryEndpoint}] returned HTTP ${response.status}, attempting direct connection: [${fallbackEndpoint}]...`);
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    }
  } catch (primaryErr) {
    // Surface AbortError (timeout) immediately — no fallback for intentional cancellations
    if (primaryErr?.name === 'AbortError') {
      clearTimeout(timeoutId);
      throw classifyError(primaryErr, 'cloneVoice primary');
    }
    console.warn(`Primary endpoint [${primaryEndpoint}] failed, attempting fallback [${fallbackEndpoint}]...`, primaryErr);
    try {
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } catch (networkError) {
      clearTimeout(timeoutId);
      console.error('Backend connection failed:', networkError);
      throw classifyError(
        new Error(
          `Cannot connect to backend server at ${apiBaseUrl}. Ensure your Django server is running (python manage.py runserver) and CORS is allowed.`
        ),
        'cloneVoice fallback'
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle HTTP error responses
  if (!response.ok) {
    let errorMessage = `Server responded with status ${response.status} (${response.statusText})`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errJson = await response.json();
        // Handle DRF validation error maps or custom { "error": "..." }
        if (errJson.error) {
          errorMessage = errJson.error;
        } else if (errJson.detail) {
          errorMessage = errJson.detail;
        } else if (errJson.message) {
          errorMessage = errJson.message;
        } else {
          // Flatten field error lists
          const fieldErrors = Object.entries(errJson)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
      } else {
        const errText = await response.text();
        if (errText && errText.length < 300) {
          errorMessage = errText;
        }
      }
    } catch {
      // Keep default status message
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') || '';

  // Case 1: Direct binary audio response (audio/wav, audio/mpeg, octet-stream)
  if (contentType.includes('audio') || contentType.includes('application/octet-stream')) {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return {
      audioUrl,
      blob: audioBlob,
      audioFormat: 'wav',
      audioSizeBytes: audioBlob.size,
      message: 'Voice generated successfully',
    };
  }

  // Case 2: JSON response (Standard IndicF5 Backend Contract)
  if (contentType.includes('application/json')) {
    const data = await response.json();
    console.log('[VoiceClone API] IndicF5 backend response received:', data);

    // Primary Contract: audio_data or audio_base64
    const base64Data = data.audio_data || data.audio_base64;
    const format = data.audio_format || 'wav';

    if (base64Data) {
      const { audioUrl, blob } = base64ToBlobUrl(base64Data, format);
      return {
        audioUrl,
        blob,
        audioFormat: format,
        audioSizeBytes: data.audio_size_bytes || blob.size,
        message: data.message || 'Voice generated successfully',
        // New response fields from backend (Section 5 & 7 of BACKEND_DOCUMENTATION.md)
        speed: data.speed,
        tone: data.tone,
        toneName: data.tone_name,
        cfgStrength: data.cfg_strength,
      };
    }

    // Secondary Contract: audio_url
    if (data.audio_url) {
      let finalUrl = data.audio_url;
      if (finalUrl.startsWith('/')) {
        finalUrl = isLocal ? finalUrl : `${apiBaseUrl.replace(/\/+$/, '')}${finalUrl}`;
      }
      return {
        audioUrl: finalUrl,
        audioFormat: format,
        audioSizeBytes: data.audio_size_bytes,
        message: data.message || 'Voice generated successfully',
      };
    }

    // Deep search fallback if schema differs slightly
    const candidateKeys = [
      'output_audio', 'output_url', 'file', 'file_url', 'generated_audio', 'cloned_audio'
    ];
    for (const key of candidateKeys) {
      if (data[key] && typeof data[key] === 'string') {
        const val = data[key];
        if (val.length > 500) {
          const { audioUrl, blob } = base64ToBlobUrl(val, format);
          return { audioUrl, blob, audioFormat: format, message: data.message };
        }
        return { audioUrl: val, audioFormat: format, message: data.message };
      }
    }

    throw new Error(
      `Backend responded with JSON, but did not contain 'audio_data' or 'audio_base64'. Keys received: [${Object.keys(data).join(', ')}]`
    );
  }

  // Fallback blob
  const fallbackBlob = await response.blob();
  const audioUrl = URL.createObjectURL(fallbackBlob);
  return {
    audioUrl,
    blob: fallbackBlob,
    audioFormat: 'wav',
    audioSizeBytes: fallbackBlob.size,
    message: 'Voice generated successfully',
  };
}
