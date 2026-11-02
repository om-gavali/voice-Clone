import React, { useMemo } from 'react';
import {
  Clock,
  Hourglass,
  Sparkles,
  Cpu,
  Layers,
  Volume2,
  CheckCircle2,
  Activity,
  Zap,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { formatDuration } from '../utils/timeEstimator';

const SYNTHESIS_STAGES = [
  {
    id: 1,
    title: 'Audio Preprocessing',
    shortName: 'Spectrogram',
    description: 'Analyzing reference audio clip & extracting acoustic mel-spectrogram...',
    icon: Volume2,
    minProgress: 0,
    maxProgress: 20,
  },
  {
    id: 2,
    title: 'Speaker Voice Profiling',
    shortName: 'Voice Profile',
    description: 'Mapping speaker vocal timbre, fundamental pitch & acoustic embeddings...',
    icon: Sparkles,
    minProgress: 20,
    maxProgress: 45,
  },
  {
    id: 3,
    title: 'Diffusion DiT Inference',
    shortName: 'DiT Latents',
    description: 'Synthesizing neural speech tokens with F5-TTS Diffusion Transformer...',
    icon: Cpu,
    minProgress: 45,
    maxProgress: 75,
  },
  {
    id: 4,
    title: 'Vocos Waveform Synthesis',
    shortName: 'Vocoder',
    description: 'Reconstructing high-fidelity 24kHz audio waveform via Vocos neural vocoder...',
    icon: Layers,
    minProgress: 75,
    maxProgress: 92,
  },
  {
    id: 5,
    title: 'Mastering & Finalizing',
    shortName: 'Mastering',
    description: 'Packaging speech payload, normalizing dynamic range & preparing playback...',
    icon: Activity,
    minProgress: 92,
    maxProgress: 100,
  },
];

export default function VoiceSynthesisProgress({
  progress = 0,
  elapsedSeconds = 0,
  estimatedTotalSeconds = 60,
  targetText = '',
}) {
  // Clamped progress value (0 to 100)
  const currentProgress = Math.max(0, Math.min(100, progress));
  const isComplete = currentProgress >= 100;

  const targetChars = (targetText || '').trim().length;
  const targetWords = (targetText || '').trim().split(/\s+/).filter(Boolean).length;

  // Active stage
  const activeStage = useMemo(() => {
    if (isComplete) {
      return {
        id: 5,
        title: 'Voice Synthesized',
        shortName: 'Complete',
        description: 'Audio generation finished! Initializing audio player...',
        icon: CheckCircle2,
      };
    }
    const found = SYNTHESIS_STAGES.find(
      (s) => currentProgress >= s.minProgress && currentProgress < s.maxProgress
    );
    return found || SYNTHESIS_STAGES[SYNTHESIS_STAGES.length - 1];
  }, [currentProgress, isComplete]);

  // Estimated remaining seconds
  const remainingSeconds = useMemo(() => {
    if (isComplete) return 0;
    const diff = Math.round(estimatedTotalSeconds - elapsedSeconds);
    return Math.max(1, diff);
  }, [isComplete, estimatedTotalSeconds, elapsedSeconds]);

  const StageIcon = activeStage.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-soft p-6 sm:p-7 text-center space-y-5 animate-in fade-in duration-300 transition-colors"
    >
      {/* 1. Animated Equalizer Waveform Bars (Matching screenshot aesthetic) */}
      <div className="flex items-center justify-center gap-1.5 h-8">
        <span
          className="w-1.5 h-6 bg-sky-500 rounded-full animate-pulse-bar"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-8 bg-indigo-500 rounded-full animate-pulse-bar"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-5 bg-sky-400 rounded-full animate-pulse-bar"
          style={{ animationDelay: '300ms' }}
        />
        <span
          className="w-1.5 h-7 bg-indigo-600 rounded-full animate-pulse-bar"
          style={{ animationDelay: '450ms' }}
        />
        <span
          className="w-1.5 h-4 bg-sky-300 rounded-full animate-pulse-bar"
          style={{ animationDelay: '600ms' }}
        />
      </div>

      {/* 2. Header Status & Live Percentage */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
          <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 animate-pulse shrink-0" />
          <span>
            {isComplete ? (
              'Voice synthesized successfully!'
            ) : (
              <>
                Synthesizing speech...{' '}
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 font-mono">
                  (Est. {formatDuration(estimatedTotalSeconds)})
                </span>
              </>
            )}
          </span>
        </div>

        {/* Live Percentage Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800/70 text-sky-700 dark:text-sky-300 text-xs sm:text-sm font-bold tabular-nums shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'
              }`}
          />
          <span>{Math.round(currentProgress)}%</span>
        </div>
      </div>

      {/* Model cold-start notice: appears after 15s on first request while model loads into GPU */}
      {!isComplete && elapsedSeconds >= 15 && currentProgress < 20 && (
        <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-2 text-left">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>First request:</strong> IndicF5 model is loading into GPU memory — this takes
            1–3 min on cold start. Subsequent requests will complete in ~10–30s.
          </span>
        </div>
      )}

      {/* 3. Live Glowing Progress Bar with Shimmer Effect */}
      <div className="space-y-1.5">
        <div
          className="relative w-full h-3.5 sm:h-4 bg-slate-100 dark:bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-200/90 dark:border-slate-700/80 shadow-inner"
          aria-label="Speech synthesis generation progress"
        >
          {/* Animated gradient progress fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out relative shadow-[0_0_12px_rgba(56,189,248,0.4)]"
            style={{ width: `${Math.max(3, currentProgress)}%` }}
          >
            {/* Moving light sweep shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer-sweep pointer-events-none" />

            {/* Glowing tip pill */}
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
          </div>
        </div>
      </div>

      {/* 4. Active Pipeline Stage Details & Description */}
      <div className="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-800/80 text-left space-y-2.5 transition-colors">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
            <div className="p-1 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
              <StageIcon className="w-3.5 h-3.5" />
            </div>
            <span>
              Stage {activeStage.id} of 5:{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {activeStage.title}
              </strong>
            </span>
          </div>

          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {isComplete ? 'Complete' : 'In Progress'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {activeStage.description}
        </p>

        {/* 5-Step Pipeline Chips / Stepper */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1.5">
          {SYNTHESIS_STAGES.map((s) => {
            const isPast = currentProgress >= s.maxProgress;
            const isCurrent =
              !isComplete && currentProgress >= s.minProgress && currentProgress < s.maxProgress;
            const isDoneOrComplete = isPast || isComplete;

            return (
              <div key={s.id} className="flex flex-col items-center gap-1 group">
                {/* Step indicator bar */}
                <div
                  className={`w-full h-1.5 rounded-full transition-all duration-300 ${isDoneOrComplete
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : isCurrent
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                />
                {/* Step short label */}
                <span
                  className={`text-[10px] sm:text-[11px] truncate max-w-full font-medium transition-colors ${isDoneOrComplete
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : isCurrent
                        ? 'text-sky-700 dark:text-sky-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  title={s.title}
                >
                  {s.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Metrics Footer: Elapsed Time, Total Estimate & Dynamic Remaining Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Elapsed:{' '}
            <strong className="text-slate-700 dark:text-slate-200 font-mono font-semibold">
              {elapsedSeconds}s
            </strong>
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono ml-1">
              / ~{estimatedTotalSeconds}s
            </span>
          </span>
        </div>

        {targetChars > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Target:{' '}
              <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                {targetChars} chars
              </strong>
              {targetWords > 0 && <span className="text-slate-400 ml-1">({targetWords} words)</span>}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Hourglass className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {isComplete ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Ready</span>
            ) : elapsedSeconds >= estimatedTotalSeconds ? (
              <span className="text-sky-600 dark:text-sky-400 font-medium animate-pulse">Finalizing audio...</span>
            ) : (
              <>
                Est. remaining:{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-mono font-semibold">
                  ~{remainingSeconds}s
                </strong>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
