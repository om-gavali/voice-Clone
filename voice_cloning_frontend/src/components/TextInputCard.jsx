import React from 'react';
import { Sparkles, PlayCircle, Clock } from 'lucide-react';
import { estimateSynthesisSeconds, formatDuration } from '../utils/timeEstimator';

export default function TextInputCard({
  referenceText,
  onChangeReferenceText,
  targetText,
  onChangeTargetText,
  onFillSample,
  onPreviewSampleResult,
  speed = 1.0,
}) {
  const chars = (targetText || '').trim().length;
  const words = (targetText || '').trim().split(/\s+/).filter(Boolean).length;
  const estimatedSec = estimateSynthesisSeconds(targetText, speed);
  return (
    <div className="space-y-6">
      {/* Sample presets shortcut banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-sky-50/70 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700/80 rounded-xl px-4 py-2.5 transition-colors duration-200">
        <div className="flex items-center gap-2 text-xs text-sky-800 dark:text-sky-200 font-medium">
          <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>Need sample text or instant output preview?</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFillSample}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-medium px-3 py-1 rounded-lg border border-sky-200 dark:border-slate-600 transition-colors shadow-xs cursor-pointer"
          >
            Auto-fill Inputs
          </button>
          {onPreviewSampleResult && (
            <button
              type="button"
              onClick={onPreviewSampleResult}
              className="text-xs bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-medium px-3 py-1 rounded-lg border border-transparent transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Preview Result Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Reference Text Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="reference-text"
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-xs font-bold">
              2
            </span>
            Reference Audio Text
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {referenceText.length} characters
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Enter what was spoken in the reference audio clip. Accurate text helps the model align phonemes.
        </p>

        <div className="relative">
          <textarea
            id="reference-text"
            rows={3}
            value={referenceText}
            onChange={(e) => onChangeReferenceText(e.target.value)}
            placeholder="e.g. Never regret a day in your life: good days give happiness, bad days give experience."
            className="w-full text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50/60 dark:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/50 outline-none p-3.5 transition-all resize-y"
          />
        </div>
      </div>

      {/* Target Text Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="target-text"
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-xs font-bold">
              3
            </span>
            Target Text (Voice to Generate)
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {targetText.length} characters
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Enter the new sentence you want the cloned voice to speak.
        </p>

        <div className="relative">
          <textarea
            id="target-text"
            rows={4}
            value={targetText}
            onChange={(e) => onChangeTargetText(e.target.value)}
            placeholder="e.g. Welcome everyone to the voice cloning showcase. This voice was synthesized in real time."
            className="w-full text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50/60 dark:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/50 outline-none p-3.5 transition-all resize-y"
          />

          {/* Real-time estimated duration based on text length */}
          {chars > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {chars} chars
                </span>
                <span>•</span>
                <span>{words} {words === 1 ? 'word' : 'words'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-100 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 text-[11px] font-medium shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>
                  Est. Cloning Time:{' '}
                  <strong className="font-semibold font-mono text-sky-800 dark:text-sky-200">
                    {formatDuration(estimatedSec)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
