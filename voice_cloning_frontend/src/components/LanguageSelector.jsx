import React, { useRef, useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

/**
 * All 11 languages supported by the ai4bharat/IndicF5 model.
 * code   – BCP-47/ISO language code (sent to backend as `language`)
 * label  – English display name
 * native – Script name in the language itself
 * flag   – Country-flag emoji representative of the language
 */
export const INDICF5_LANGUAGES = [
  { code: 'hi',  label: 'Hindi',     native: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'bn',  label: 'Bengali',   native: 'বাংলা',       flag: '🇧🇩' },
  { code: 'te',  label: 'Telugu',    native: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'mr',  label: 'Marathi',   native: 'मराठी',       flag: '🇮🇳' },
  { code: 'ta',  label: 'Tamil',     native: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'gu',  label: 'Gujarati',  native: 'ગુજરાતી',     flag: '🇮🇳' },
  { code: 'kn',  label: 'Kannada',   native: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'ml',  label: 'Malayalam', native: 'മലയാളം',      flag: '🇮🇳' },
  { code: 'pa',  label: 'Punjabi',   native: 'ਪੰਜਾਬੀ',      flag: '🇮🇳' },
  { code: 'or',  label: 'Odia',      native: 'ଓଡ଼ିଆ',       flag: '🇮🇳' },
  { code: 'as',  label: 'Assamese',  native: 'অসমীয়া',     flag: '🇮🇳' },
];

export default function LanguageSelector({ selectedLanguage, onSelectLanguage }) {
  const scrollRef = useRef(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const checkFades = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 8);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    checkFades();
    window.addEventListener('resize', checkFades);
    return () => window.removeEventListener('resize', checkFades);
  }, []);

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm sticky top-[57px] sm:top-[61px] z-20 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide select-none">
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden sm:inline">Language</span>
        </div>

        {/* Fade + scrollable pill row */}
        <div className="relative flex-1 min-w-0">
          {/* Left fade */}
          {showLeftFade && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />
          )}

          <div
            ref={scrollRef}
            onScroll={checkFades}
            className="flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {INDICF5_LANGUAGES.map((lang) => {
              const isActive = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  id={`lang-btn-${lang.code}`}
                  onClick={() => onSelectLanguage(lang.code)}
                  title={`${lang.label} (${lang.native})`}
                  className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                    whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer
                    ${isActive
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-400/30 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-200 dark:hover:border-slate-600 border border-transparent'
                    }
                  `}
                >
                  <span className="text-sm leading-none">{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.label}</span>
                  <span
                    className={`font-normal text-[10px] leading-none ${
                      isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {lang.native}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right fade */}
          {showRightFade && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />
          )}
        </div>
      </div>
    </div>
  );
}
