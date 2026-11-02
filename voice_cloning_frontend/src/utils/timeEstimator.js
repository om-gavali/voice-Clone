/**
 * Accurate timing estimation for IndicF5 / F5-TTS Neural Voice Cloning.
 *
 * Automatically calibrates to the user's specific CPU or GPU hardware performance
 * by learning from measured synthesis speeds.
 */

const STORAGE_KEY_RATE = 'indicf5_sec_per_char';
// Baseline calibrated to standard local CPU inference:
// 152 characters took ~62s -> ~8s baseline overhead + 152 * 0.355s = 62s
const DEFAULT_SEC_PER_CHAR = 0.355;
const BASE_OVERHEAD_SEC = 8;

/**
 * Calculates estimated voice cloning duration in seconds based on target text length and speed.
 *
 * @param {string} text - Target text to be synthesized
 * @param {number} [speed=1.0] - Speech speed multiplier
 * @returns {number} Estimated total duration in whole seconds
 */
export function estimateSynthesisSeconds(text = '', speed = 1.0) {
  const chars = (text || '').trim().length;
  if (chars === 0) return 0;

  let secPerChar = DEFAULT_SEC_PER_CHAR;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RATE);
    if (saved) {
      const parsed = parseFloat(saved);
      if (parsed >= 0.02 && parsed <= 1.5) {
        secPerChar = parsed;
      }
    }
  } catch {
    // Ignore localStorage access issues
  }

  const effectiveSpeed = Math.max(0.5, Math.min(2.0, speed || 1.0));
  // Inverse relationship with speed: faster speaking rate produces fewer audio frames
  const rawEstimate = BASE_OVERHEAD_SEC + (chars * secPerChar) / Math.sqrt(effectiveSpeed);

  // Return clamped estimate (minimum 10s for neural DiT inference)
  return Math.max(10, Math.round(rawEstimate));
}

/**
 * Updates hardware calibration based on actual measured synthesis time.
 * Smoothly averages previous rate to ensure future estimates match user's device.
 *
 * @param {number} actualElapsedSeconds - Actual elapsed time
 * @param {string} text - Target text synthesized
 */
export function recordActualSynthesisTime(actualElapsedSeconds, text = '') {
  const chars = (text || '').trim().length;
  if (!actualElapsedSeconds || chars < 15) return;

  const netInference = Math.max(2, actualElapsedSeconds - BASE_OVERHEAD_SEC);
  const measuredRate = netInference / chars;

  if (measuredRate >= 0.02 && measuredRate <= 1.5) {
    try {
      const existing = localStorage.getItem(STORAGE_KEY_RATE);
      if (existing) {
        // Exponential moving average: 65% existing, 35% new measurement
        const smoothed = parseFloat(existing) * 0.65 + measuredRate * 0.35;
        localStorage.setItem(STORAGE_KEY_RATE, smoothed.toFixed(3));
      } else {
        localStorage.setItem(STORAGE_KEY_RATE, measuredRate.toFixed(3));
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Formats duration into human-readable format, e.g. "~45s" or "~1m 15s"
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const sec = Math.round(seconds);
  if (sec < 60) return `~${sec}s`;
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec === 0 ? `~${mins}m` : `~${mins}m ${remSec}s`;
}
