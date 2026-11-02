import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '', showLabel = true }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      onClick={toggleTheme}
      className={`
        group relative inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full
        transition-all duration-300 ease-out cursor-pointer select-none
        border border-slate-200/90 dark:border-slate-700/80
        bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700/90
        text-slate-700 dark:text-slate-200 shadow-xs hover:shadow-sm
        focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50
        ${className}
      `}
    >
      {/* Sliding pill track animation container */}
      <div className="relative flex items-center justify-between w-12 h-6 px-0.5 rounded-full bg-slate-200/80 dark:bg-slate-900/90 transition-colors duration-300">
        {/* Sun Icon on left */}
        <Sun
          className={`w-3.5 h-3.5 ml-1 transition-all duration-300 ${
            isDark
              ? 'text-slate-500 opacity-40 scale-75'
              : 'text-amber-500 opacity-100 scale-100 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
          }`}
        />

        {/* Moon Icon on right */}
        <Moon
          className={`w-3.5 h-3.5 mr-1 transition-all duration-300 ${
            isDark
              ? 'text-sky-300 opacity-100 scale-100 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]'
              : 'text-slate-400 opacity-40 scale-75'
          }`}
        />

        {/* Sliding Thumb */}
        <span
          className={`
            absolute top-0.5 w-5 h-5 rounded-full shadow-sm
            transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            flex items-center justify-center
            ${
              isDark
                ? 'translate-x-6 bg-gradient-to-tr from-sky-400 to-indigo-400 text-slate-900 shadow-sky-500/30'
                : 'translate-x-0.5 bg-white text-amber-500 shadow-slate-300/60'
            }
          `}
        >
          {isDark ? (
            <Moon className="w-3 h-3 text-slate-950 fill-current" />
          ) : (
            <Sun className="w-3 h-3 text-amber-500 fill-current" />
          )}
        </span>
      </div>

      {showLabel && (
        <span className="hidden sm:inline text-xs font-medium tracking-tight">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
