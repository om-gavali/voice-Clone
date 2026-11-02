import React from 'react';
import {
  AlertCircle,
  XCircle,
  HelpCircle,
  WifiOff,
  Clock,
  BadgeAlert,
  ServerCrash,
  ShieldOff,
  SearchX,
  AudioWaveform,
  CircleX,
} from 'lucide-react';
import { ErrorCategory, getErrorTitle, classifyError } from '../utils/errors';

/**
 * Sanitises a backend URL for safe display.
 * Only allows http:// and https:// schemes.
 */
function sanitiseDisplayUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.length > 120 ? trimmed.slice(0, 120) + '…' : trimmed;
  }
  return '[invalid URL]';
}

const CATEGORY_ICONS = {
  [ErrorCategory.NETWORK]:    WifiOff,
  [ErrorCategory.TIMEOUT]:    Clock,
  [ErrorCategory.VALIDATION]: BadgeAlert,
  [ErrorCategory.SERVER]:     ServerCrash,
  [ErrorCategory.AUTH]:       ShieldOff,
  [ErrorCategory.NOT_FOUND]:  SearchX,
  [ErrorCategory.AUDIO]:      AudioWaveform,
  [ErrorCategory.ABORT]:      CircleX,
  [ErrorCategory.UNKNOWN]:    AlertCircle,
};

const CATEGORY_COLORS = {
  [ErrorCategory.NETWORK]:    { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900/60', icon: 'bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-300', title: 'text-orange-900 dark:text-orange-200', msg: 'text-orange-800 dark:text-orange-300' },
  [ErrorCategory.TIMEOUT]:    { bg: 'bg-amber-50 dark:bg-amber-950/40',  border: 'border-amber-200 dark:border-amber-900/60',  icon: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300',   title: 'text-amber-900 dark:text-amber-200',  msg: 'text-amber-800 dark:text-amber-300'  },
  [ErrorCategory.VALIDATION]: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-900/60', icon: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-300', title: 'text-yellow-900 dark:text-yellow-200', msg: 'text-yellow-800 dark:text-yellow-300' },
  [ErrorCategory.SERVER]:     { bg: 'bg-rose-50 dark:bg-rose-950/40',   border: 'border-rose-200 dark:border-rose-900/60',   icon: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300',     title: 'text-rose-900 dark:text-rose-200',   msg: 'text-rose-700 dark:text-rose-300'   },
  [ErrorCategory.AUTH]:       { bg: 'bg-rose-50 dark:bg-rose-950/40',   border: 'border-rose-200 dark:border-rose-900/60',   icon: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300',     title: 'text-rose-900 dark:text-rose-200',   msg: 'text-rose-700 dark:text-rose-300'   },
  [ErrorCategory.NOT_FOUND]:  { bg: 'bg-slate-50 dark:bg-slate-900/60', border: 'border-slate-200 dark:border-slate-700/60', icon: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',   title: 'text-slate-900 dark:text-slate-200', msg: 'text-slate-700 dark:text-slate-300' },
  [ErrorCategory.AUDIO]:      { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/60', icon: 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300', title: 'text-purple-900 dark:text-purple-200', msg: 'text-purple-700 dark:text-purple-300' },
  [ErrorCategory.ABORT]:      { bg: 'bg-slate-50 dark:bg-slate-900/60', border: 'border-slate-200 dark:border-slate-700/60', icon: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',   title: 'text-slate-900 dark:text-slate-200', msg: 'text-slate-700 dark:text-slate-300' },
  [ErrorCategory.UNKNOWN]:    { bg: 'bg-rose-50 dark:bg-rose-950/40',   border: 'border-rose-200 dark:border-rose-900/60',   icon: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300',     title: 'text-rose-900 dark:text-rose-200',   msg: 'text-rose-700 dark:text-rose-300'   },
};

/**
 * Renders a contextual error alert.
 *
 * @param {Object} props
 * @param {string|null} props.error  - Raw error message string (or null to hide)
 * @param {string} [props.category]  - Optional pre-classified ErrorCategory (auto-detected if omitted)
 * @param {string} [props.hint]      - Optional troubleshooting hint
 * @param {Function} props.onDismiss - Callback to clear the error
 * @param {Function} [props.onRetry] - Optional retry callback; renders a Retry button if provided
 * @param {string} [props.backendUrl]- Backend URL for connection-error troubleshooting tips
 */
export default function ErrorAlert({ error, category: categoryProp, hint: hintProp, onDismiss, onRetry, backendUrl }) {
  if (!error) return null;

  // Classify the raw error string into a structured error when no category is pre-supplied
  const classified = classifyError({ message: error, name: 'Error' });
  const category = categoryProp || classified.category;
  const hint = hintProp || classified.hint;

  // Don't show abort errors to the user — they're intentional
  if (category === ErrorCategory.ABORT) return null;

  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS[ErrorCategory.UNKNOWN];
  const Icon = CATEGORY_ICONS[category] || AlertCircle;
  const title = getErrorTitle(category);

  const isNetworkError = category === ErrorCategory.NETWORK;
  const isNotFoundError = category === ErrorCategory.NOT_FOUND;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${colors.bg} ${colors.border} border rounded-2xl p-4 sm:p-5 shadow-sm relative transition-all animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className="w-4.5 h-4.5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 pr-8">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-sm font-semibold ${colors.title}`}>{title}</h4>
            {/* Category badge */}
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${colors.icon} opacity-80`}>
              {category}
            </span>
          </div>

          {/* Error message */}
          <p className={`text-xs mt-1 break-words font-medium ${colors.msg}`}>
            {error}
          </p>

          {/* Hint */}
          {hint && (
            <p className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 flex items-start gap-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              <span>{hint}</span>
            </p>
          )}

          {/* Network-specific troubleshooting panel */}
          {(isNetworkError || isNotFoundError) && (
            <div className="mt-3 p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                <span>Django Backend Troubleshooting:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                <li>
                  Start the server:{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    python manage.py runserver
                  </code>
                </li>
                {backendUrl && (
                  <li>
                    Check your endpoint:{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono break-all">
                      {sanitiseDisplayUrl(backendUrl)}/voice/clone/
                    </code>
                  </li>
                )}
                <li>
                  Ensure{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    django-cors-headers
                  </code>{' '}
                  allows{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    http://localhost:5173
                  </code>
                </li>
              </ul>
            </div>
          )}

          {/* Validation-specific parameter reminder */}
          {category === ErrorCategory.VALIDATION && (
            <div className="mt-2 p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Valid parameter ranges:</p>
              <ul className="space-y-0.5 list-disc list-inside pl-1">
                <li>Speed: <code className="font-mono">0.3 – 2.5</code></li>
                <li>Pitch shift: <code className="font-mono">-6.0 – +6.0 semitones</code></li>
                <li>CFG strength: <code className="font-mono">1.0 – 3.5</code></li>
              </ul>
            </div>
          )}

          {/* Retry button */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
