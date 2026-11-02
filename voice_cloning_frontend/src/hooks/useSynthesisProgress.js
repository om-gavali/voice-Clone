import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { estimateSynthesisSeconds } from '../utils/timeEstimator';

/**
 * Custom hook to manage realistic, smooth live progress tracking during voice synthesis.
 * Accurately estimates cloning duration based on target text length and speed, calibrated
 * to the user's specific CPU/GPU hardware.
 *
 * @param {Object} options
 * @param {boolean} options.isLoading - Whether speech synthesis is currently active
 * @param {string} options.targetText - The target text being synthesized
 * @param {number} [options.speed=1.0] - Speech playback/generation speed multiplier
 * @returns {Object} progress state and helpers
 */
export function useSynthesisProgress({ isLoading, targetText = '', speed = 1.0 }) {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  // Ref to track mount state — prevents setState after unmount without adding an extra useEffect
  const mountedRef = useRef(true);
  // Holds the completion delay timeout so it can be cancelled on unmount / reset
  const completionTimerRef = useRef(null);

  // Dynamic estimated duration accurately based on target text length & speed
  const estimatedTotalSeconds = useMemo(() => {
    return estimateSynthesisSeconds(targetText, speed);
  }, [targetText, speed]);

  // Track component mount status independently across component lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, []);

  // Reset helper
  const resetProgress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (mountedRef.current) {
      setProgress(0);
      setElapsedSeconds(0);
      setIsCompleting(false);
    }
  }, []);

  // Live progress simulation ticker
  useEffect(() => {
    if (!isLoading || isCompleting) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();
    let runProgress = 4;
    setProgress(4);
    setElapsedSeconds(0);

    const estimatedMs = estimatedTotalSeconds * 1000;

    const tick = () => {
      if (!startTimeRef.current || !mountedRef.current) return;

      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const currentElapsedSec = Math.floor(elapsedMs / 1000);
      setElapsedSeconds(currentElapsedSec);

      // Smooth progress calculation across the accurate estimated duration
      let calculatedProgress = 4;
      const t = elapsedMs / estimatedMs;
      if (t < 0.95) {
        // Progresses smoothly from 4% to 94% across the estimated duration
        const easeT = 1 - Math.pow(1 - t, 1.4);
        calculatedProgress = 4 + easeT * 90;
      } else {
        // Gentle crawl from 94% to 98% if server takes slightly longer than estimated
        const overRatio = Math.min(1, (elapsedMs - estimatedMs * 0.95) / (estimatedMs * 0.4 || 1000));
        calculatedProgress = 94 + overRatio * 4;
      }

      runProgress = Math.max(runProgress, Math.min(98, Math.round(calculatedProgress)));
      setProgress(runProgress);
    };

    timerRef.current = setInterval(tick, 120);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, isCompleting, estimatedTotalSeconds]);

  // Complete helper: immediately snaps to 100%, runs a brief satisfaction delay, then finishes
  const triggerCompletion = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    if (mountedRef.current) {
      setProgress(100);
      setIsCompleting(true);
    }

    // Allow user to see 100% completion badge briefly before revealing audio card
    return new Promise((resolve) => {
      completionTimerRef.current = setTimeout(() => {
        completionTimerRef.current = null;
        if (mountedRef.current) {
          setIsCompleting(false);
        }
        resolve();
      }, 400);
    });
  }, []);

  return {
    progress,
    elapsedSeconds,
    estimatedTotalSeconds,
    isCompleting,
    triggerCompletion,
    resetProgress,
  };
}
