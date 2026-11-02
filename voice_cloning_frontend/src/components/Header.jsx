import React from 'react';
import { Volume2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/25 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-white transition-colors">
                VoiceClone <span className="text-sky-600 dark:text-sky-400 font-semibold">Studio</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden xs:block sm:block transition-colors">
              Clean, zero-hassle voice cloning &amp; speech synthesis
            </p>
          </div>
        </div>

        {/* Right Corner: Dark Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
