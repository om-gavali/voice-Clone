/**
 * Centralised error utilities for the Voice Cloning frontend.
 * Provides consistent error classification, user-friendly messaging,
 * and structured error objects used across API, UI, and hooks.
 */

/** @enum {string} All recognised error categories */
export const ErrorCategory = {
  NETWORK: 'NETWORK',       // Backend unreachable / DNS / CORS
  TIMEOUT: 'TIMEOUT',       // Request exceeded time limit
  VALIDATION: 'VALIDATION', // Bad input fields (speed, pitch, etc.)
  SERVER: 'SERVER',         // Backend 5xx / model crash
  AUTH: 'AUTH',             // 401 / 403
  NOT_FOUND: 'NOT_FOUND',   // 404 endpoint missing
  AUDIO: 'AUDIO',           // Bad audio data / decode failure
  ABORT: 'ABORT',           // Request was intentionally cancelled
  UNKNOWN: 'UNKNOWN',       // Catch-all
};

/**
 * A structured error enriched with category and optional hint.
 */
export class VoiceCloneError extends Error {
  /**
   * @param {string} message - Human-readable message shown to the user
   * @param {string} category - One of ErrorCategory values
   * @param {string} [hint] - Optional troubleshooting tip
   * @param {Error} [cause] - Original underlying error
   */
  constructor(message, category = ErrorCategory.UNKNOWN, hint = null, cause = null) {
    super(message);
    this.name = 'VoiceCloneError';
    this.category = category;
    this.hint = hint;
    this.cause = cause;
  }
}

/**
 * Inspect any thrown value and return a normalised VoiceCloneError.
 *
 * @param {unknown} err - Anything thrown (Error, string, object, etc.)
 * @param {string} [context] - Short description of where the error occurred (for logging)
 * @returns {VoiceCloneError}
 */
export function classifyError(err, context = '') {
  if (err instanceof VoiceCloneError) return err;

  const msg = (err?.message || String(err) || 'Unknown error').toLowerCase();

  // Intentional abort — don't surface to the user as an error
  if (err?.name === 'AbortError' || msg.includes('aborted') || msg.includes('abort')) {
    return new VoiceCloneError('Request was cancelled.', ErrorCategory.ABORT, null, err);
  }

  // Network / CORS / DNS
  if (
    err?.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('cannot connect') ||
    msg.includes('load failed') ||
    msg.includes('network request failed') ||
    msg.includes('net::err_')
  ) {
    return new VoiceCloneError(
      'Cannot reach the backend server. Check that Django is running and CORS is configured.',
      ErrorCategory.NETWORK,
      'Run: python manage.py runserver',
      err
    );
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('timed out') || err?.name === 'TimeoutError') {
    return new VoiceCloneError(
      'The request timed out. The model may still be loading or the server is overloaded.',
      ErrorCategory.TIMEOUT,
      'Try again in a moment, or reduce the length of your target text.',
      err
    );
  }

  // Validation errors from backend (specific field messages)
  if (
    msg.includes('speed must be') ||
    msg.includes('pitch_shift must be') ||
    msg.includes('cfg_strength must be') ||
    msg.includes('reference_audio is required') ||
    msg.includes('reference_text') ||
    msg.includes('target_text') ||
    msg.includes('is required') ||
    (msg.includes('invalid') && (msg.includes('speed') || msg.includes('pitch') || msg.includes('cfg')))
  ) {
    return new VoiceCloneError(
      err?.message || 'One of your inputs failed validation on the server.',
      ErrorCategory.VALIDATION,
      'Check that speed is 0.3–2.5, pitch is -6 to +6, and CFG is 1.0–3.5.',
      err
    );
  }

  // Server / model errors
  if (
    msg.includes('500') ||
    msg.includes('internal server error') ||
    msg.includes('something went wrong') ||
    msg.includes('generation failed') ||
    msg.includes('inference') ||
    msg.includes('model')
  ) {
    return new VoiceCloneError(
      err?.message || 'The backend encountered an error during voice generation.',
      ErrorCategory.SERVER,
      'Check the Django server console for traceback details.',
      err
    );
  }

  // Auth errors
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return new VoiceCloneError(
      'Access denied by the server (401/403).',
      ErrorCategory.AUTH,
      'Check your backend authentication configuration.',
      err
    );
  }

  // Not found
  if (msg.includes('404') || msg.includes('not found')) {
    return new VoiceCloneError(
      'The API endpoint was not found (404). Check your backend URL.',
      ErrorCategory.NOT_FOUND,
      'Ensure the backend route is: POST /voice/clone/',
      err
    );
  }

  // Audio decode / base64 errors
  if (
    msg.includes('base64') ||
    msg.includes('audio data') ||
    msg.includes('decode') ||
    msg.includes('audio_data') ||
    msg.includes('audio_base64') ||
    msg.includes('blob')
  ) {
    return new VoiceCloneError(
      err?.message || 'The generated audio data could not be decoded.',
      ErrorCategory.AUDIO,
      'The backend may have returned malformed audio. Check the server response.',
      err
    );
  }

  // Fallback
  return new VoiceCloneError(
    err?.message || 'An unexpected error occurred.',
    ErrorCategory.UNKNOWN,
    null,
    err
  );
}

/**
 * Returns a user-friendly title for each error category.
 * @param {string} category
 * @returns {string}
 */
export function getErrorTitle(category) {
  switch (category) {
    case ErrorCategory.NETWORK:    return 'Connection Failed';
    case ErrorCategory.TIMEOUT:    return 'Request Timed Out';
    case ErrorCategory.VALIDATION: return 'Invalid Parameters';
    case ErrorCategory.SERVER:     return 'Server Error';
    case ErrorCategory.AUTH:       return 'Access Denied';
    case ErrorCategory.NOT_FOUND:  return 'Endpoint Not Found';
    case ErrorCategory.AUDIO:      return 'Audio Decode Error';
    case ErrorCategory.ABORT:      return 'Request Cancelled';
    default:                       return 'Voice Generation Failed';
  }
}

/**
 * Returns a lucide icon name string for each error category.
 * @param {string} category
 * @returns {string}
 */
export function getErrorIcon(category) {
  switch (category) {
    case ErrorCategory.NETWORK:    return 'WifiOff';
    case ErrorCategory.TIMEOUT:    return 'Clock';
    case ErrorCategory.VALIDATION: return 'BadgeAlert';
    case ErrorCategory.SERVER:     return 'ServerCrash';
    case ErrorCategory.AUTH:       return 'ShieldOff';
    case ErrorCategory.NOT_FOUND:  return 'SearchX';
    case ErrorCategory.AUDIO:      return 'AudioWaveform';
    case ErrorCategory.ABORT:      return 'CircleX';
    default:                       return 'AlertCircle';
  }
}
