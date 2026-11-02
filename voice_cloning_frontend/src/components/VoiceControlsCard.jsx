import React, { useEffect, useState } from 'react';
import { Gauge, Mic2, Music, SlidersHorizontal, RefreshCw, ChevronDown, Info } from 'lucide-react';
import { fetchTones } from '../services/api';

// Fallback tones if API is unavailable
const FALLBACK_TONES = [
  { id: 'neutral',          name: 'Natural & Neutral',           description: 'Direct neural reproduction preserving the original reference speaker style without acoustic shaping.', default_cfg: 2.0, pitch_shift: 0.0 },
  { id: 'formal',           name: 'Corporate & Formal',          description: 'Clear, articulate, balanced delivery ideal for business meetings, training, and presentations.', default_cfg: 2.0, pitch_shift: 0.0 },
  { id: 'executive',        name: 'Executive & Authoritative',   description: 'Deep, commanding, steady presence with chest resonance for leadership and keynotes.', default_cfg: 2.2, pitch_shift: -1.2 },
  { id: 'broadcast',        name: 'News & Media Broadcast',      description: 'Dynamic, articulate, high-clarity broadcast standard for news reporting and media.', default_cfg: 2.4, pitch_shift: 0.3 },
  { id: 'narrator',         name: 'Documentary & Storyteller',   description: 'Warm, immersive, rich cadence with subtle high-end smoothing for long-form listening.', default_cfg: 1.9, pitch_shift: -0.8 },
  { id: 'customer_support', name: 'Customer Support & Friendly', description: 'Welcoming, polite, empathetic, and clear delivery for client-facing communications.', default_cfg: 1.8, pitch_shift: 0.8 },
];

const TONE_ICONS = {
  neutral:          '🎙️',
  formal:           '👔',
  executive:        '🏛️',
  broadcast:        '📡',
  narrator:         '📖',
  customer_support: '🤝',
};

/** Clamp a value between min and max, rounded to given decimals */
function clamp(val, min, max, decimals = 1) {
  return parseFloat(Math.min(max, Math.max(min, val)).toFixed(decimals));
}

/**
 * Renders a labeled range slider with live numeric display.
 */
function RangeSlider({ id, label, icon: Icon, value, min, max, step, unit, onChange, colorClass = 'sky', description, leftLabel, rightLabel }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {Icon && <Icon className={`w-3.5 h-3.5 text-${colorClass}-500 dark:text-${colorClass}-400`} />}
          {label}
        </label>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-${colorClass}-50 dark:bg-${colorClass}-950/50 text-${colorClass}-700 dark:text-${colorClass}-300 border border-${colorClass}-100 dark:border-${colorClass}-900/60`}>
          {value}{unit}
        </span>
      </div>
      {description && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{description}</p>
      )}
      <div className="relative group">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`w-full h-2 appearance-none rounded-full bg-slate-200 dark:bg-slate-700 accent-${colorClass}-600 cursor-pointer transition-all
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-${colorClass}-600
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:dark:border-slate-900
            hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-webkit-slider-thumb]:shadow-lg`}
          style={{
            background: `linear-gradient(to right, var(--slider-fill, #0ea5e9) 0%, var(--slider-fill, #0ea5e9) ${pct}%, rgb(226 232 240) ${pct}%, rgb(226 232 240) 100%)`,
          }}
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function VoiceControlsCard({
  speed,
  onSpeedChange,
  tone,
  onToneChange,
  pitchShift,
  onPitchShiftChange,
  cfgStrength,
  onCfgStrengthChange,
  apiBaseUrl,
}) {
  const [tones, setTones] = useState(FALLBACK_TONES);
  const [tonesLoading, setTonesLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch tones from backend; fallback to static list on error
  useEffect(() => {
    let cancelled = false;
    setTonesLoading(true);
    fetchTones(apiBaseUrl)
      .then((data) => {
        if (!cancelled && data?.tones?.length) {
          setTones(data.tones);
        }
      })
      .catch(() => { /* use fallback */ })
      .finally(() => {
        if (!cancelled) setTonesLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  // When a tone is selected, optionally sync CFG & pitch to that tone's defaults
  const handleToneSelect = (selectedId) => {
    onToneChange(selectedId);
    const found = tones.find((t) => t.id === selectedId);
    if (found) {
      onCfgStrengthChange(found.default_cfg);
      onPitchShiftChange(found.pitch_shift);
    }
  };

  const activeTone = tones.find((t) => t.id === tone) || tones[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft p-5 sm:p-6 space-y-5 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-xs font-bold shrink-0">
          4
        </span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Voice Controls</h3>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal ml-1">optional</span>
      </div>

      {/* Speed Slider */}
      <RangeSlider
        id="voice-speed"
        label="Voice Speed"
        icon={Gauge}
        value={speed}
        min={0.3}
        max={2.5}
        step={0.05}
        unit="×"
        onChange={(v) => onSpeedChange(clamp(v, 0.3, 2.5, 2))}
        colorClass="sky"
        description="Controls speech rate using native diffusion-step duration conditioning."
        leftLabel="0.3× Slow"
        rightLabel="2.5× Fast"
      />

      {/* Tone Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Mic2 className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Professional Tone</span>
          {tonesLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
          Acoustic shaping preset that styles vocal delivery for different professional contexts.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tones.map((t) => {
            const isActive = tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToneSelect(t.id)}
                title={t.description}
                className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                  isActive
                    ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/50 dark:border-violet-500 ring-2 ring-violet-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-base mb-0.5">{TONE_ICONS[t.id] || '🎤'}</div>
                <div className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>
                  {t.name}
                </div>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active tone description */}
        {activeTone && (
          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800/80">
            <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
            <span><span className="font-semibold text-violet-700 dark:text-violet-300">{activeTone.name}:</span> {activeTone.description}</span>
          </div>
        )}
      </div>

      {/* Advanced Controls Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Advanced Controls
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-5 p-4 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            {/* Pitch Shift */}
            <RangeSlider
              id="pitch-shift"
              label="Pitch Shift"
              icon={Music}
              value={pitchShift}
              min={-6.0}
              max={6.0}
              step={0.1}
              unit=" st"
              onChange={(v) => onPitchShiftChange(clamp(v, -6.0, 6.0, 1))}
              colorClass="rose"
              description="Semitone pitch offset. Overrides the selected tone's default pitch setting."
              leftLabel="-6 st (Deeper)"
              rightLabel="+6 st (Higher)"
            />

            {/* CFG Strength */}
            <RangeSlider
              id="cfg-strength"
              label="CFG Strength"
              icon={SlidersHorizontal}
              value={cfgStrength}
              min={1.0}
              max={3.5}
              step={0.1}
              unit=""
              onChange={(v) => onCfgStrengthChange(clamp(v, 1.0, 3.5, 1))}
              colorClass="amber"
              description="Classifier-free guidance scale. Higher values increase style adherence; lower values increase naturalness."
              leftLabel="1.0 Natural"
              rightLabel="3.5 Guided"
            />
          </div>
        )}
      </div>
    </div>
  );
}
