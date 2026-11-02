import React, { useRef, useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Volume2,
  RotateCcw,
  Loader2,
  FileAudio,
  AlertCircle,
  Sliders,
  ArrowDownToLine,
} from 'lucide-react';
import {
  SUPPORTED_FORMATS,
  MP3_BITRATES,
  convertAudioFormat,
  triggerBlobDownload,
  formatAudioSize,
} from '../utils/audioConverter';

export default function AudioResultCard({
  audioUrl,
  audioBlob,
  audioFormat = 'wav',
  audioSizeBytes,
  message,
  onReset,
  targetText,
  // New synthesis metadata from backend response
  toneName,
  speed,
  cfgStrength,
}) {
  // Format state: Default format is MP3
  const [selectedFormat, setSelectedFormat] = useState('mp3');
  const [mp3Bitrate, setMp3Bitrate] = useState(192);

  // Conversion & download states
  const [isConverting, setIsConverting] = useState(false);
  const [convertingFormat, setConvertingFormat] = useState('');
  const [downloadSuccessFormat, setDownloadSuccessFormat] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // Cache converted blobs to avoid re-encoding if the user clicks download again
  const cacheRef = useRef(new Map());
  const resultCardRef = useRef(null);

  // Smooth scroll into view when result appears
  useEffect(() => {
    if (resultCardRef.current) {
      resultCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [audioUrl]);

  // Invalidate cache when audio source changes
  useEffect(() => {
    cacheRef.current.clear();
  }, [audioUrl]);

  const activeFormatMeta =
    SUPPORTED_FORMATS.find((f) => f.id === selectedFormat) || SUPPORTED_FORMATS[0];

  /**
   * Executes audio conversion (if needed) and triggers browser download.
   */
  const handleDownload = async (formatId = selectedFormat, bitrate = mp3Bitrate) => {
    if (isConverting) return;

    setDownloadError(null);
    setIsConverting(true);
    setConvertingFormat(formatId);

    const source = audioBlob || audioUrl;
    const cacheKey = `${formatId}_${formatId === 'mp3' ? bitrate : 'default'}`;

    try {
      let finalBlob;
      let extension = formatId;

      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        finalBlob = cacheRef.current.get(cacheKey);
      } else {
        const result = await convertAudioFormat({
          audioSource: source,
          targetFormat: formatId,
          mp3Kbps: bitrate,
          originalFormat: audioFormat || 'wav',
        });
        finalBlob = result.blob;
        extension = result.extension;
        cacheRef.current.set(cacheKey, finalBlob);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const filename = `indicf5_cloned_${timestamp}.${extension}`;

      triggerBlobDownload(finalBlob, filename);

      setDownloadSuccessFormat(formatId.toUpperCase());
      setTimeout(() => {
        setDownloadSuccessFormat(null);
      }, 3500);
    } catch (err) {
      console.error('Audio conversion/download error:', err);
      setDownloadError(`Failed to process ${formatId.toUpperCase()} download: ${err.message || 'Unknown error'}`);

      // Graceful fallback to original URL download — only permit safe URL schemes
      if (audioUrl) {
        const isSafeUrl = /^blob:/i.test(audioUrl) || /^https?:\/\//i.test(audioUrl);
        if (isSafeUrl) {
          try {
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `indicf5_cloned_original.${audioFormat || 'wav'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch {
            window.open(audioUrl, '_blank', 'noopener,noreferrer');
          }
        }
      }
    } finally {
      setIsConverting(false);
      setConvertingFormat('');
    }
  };

  if (!audioUrl) return null;

  return (
    <div
      ref={resultCardRef}
      className="bg-gradient-to-b from-white to-sky-50/50 dark:from-slate-900 dark:to-slate-950 rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 shadow-soft-lg p-6 sm:p-7 transition-all mt-6"
    >
      {/* Header section */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              {message || 'Voice Generated Successfully!'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Voice</span>
        </button>
      </div>

      {/* Target text quote */}
      {targetText && (
        <div className="mb-4 bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Generated speech text:</span>
          <p className="italic text-slate-800 dark:text-slate-200">"{targetText}"</p>
        </div>
      )}

      {/* Synthesis metadata badges */}
      {(toneName || speed !== undefined || cfgStrength !== undefined) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {toneName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/60">
              <span className="font-bold">Tone:</span> {toneName}
            </span>
          )}
          {speed !== undefined && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800/60">
              <span className="font-bold">Speed:</span> {speed}×
            </span>
          )}
          {cfgStrength !== undefined && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/60">
              <span className="font-bold">CFG:</span> {cfgStrength}
            </span>
          )}
        </div>
      )}

      {/* Audio Player Container */}
      <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Volume2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Audio Playback</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase">
              Master: {audioFormat || 'wav'}
            </span>
            {audioSizeBytes && <span>{formatAudioSize(audioSizeBytes)}</span>}
          </div>
        </div>

        <audio
          key={audioUrl}
          controls
          autoPlay
          src={audioUrl}
          className="w-full h-11 rounded-lg focus:outline-none"
        />

        {/* Multi-Format Download Control Center */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* Format selection header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <FileAudio className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Choose Download Format:</span>
            </div>
            <div className="text-[11px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-800 font-medium">
              Default: MP3
            </div>
          </div>

          {/* Format Selection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUPPORTED_FORMATS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    setSelectedFormat(fmt.id);
                    setDownloadError(null);
                  }}
                  className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/50 dark:border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      {fmt.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${fmt.isDefault
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                          : isSelected
                            ? 'bg-sky-200/80 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200'
                            : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      {fmt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {fmt.tagline}
                  </p>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    .{fmt.ext}
                  </div>
                </button>
              );
            })}
          </div>

          {/* MP3 Bitrate Quality Selector (Visible when MP3 is selected) */}
          {selectedFormat === 'mp3' && (
            <div className="bg-sky-50/50 dark:bg-slate-950/60 rounded-xl p-3 border border-sky-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <Sliders className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>MP3 Audio Quality (Bitrate):</span>
                </span>
                <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold font-mono">
                  {mp3Bitrate} kbps
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MP3_BITRATES.map((rate) => {
                  const isActive = mp3Bitrate === rate.kbps;
                  return (
                    <button
                      key={rate.kbps}
                      type="button"
                      onClick={() => setMp3Bitrate(rate.kbps)}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs transition-all cursor-pointer ${isActive
                          ? 'bg-sky-600 text-white font-medium shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                    >
                      <div className="font-semibold">{rate.label}</div>
                      <div
                        className={`text-[9px] truncate ${isActive ? 'text-sky-100' : 'text-slate-400 dark:text-slate-400'
                          }`}
                      >
                        {rate.kbps === 192 ? 'HQ (Default)' : rate.kbps === 320 ? 'Studio' : 'Compact'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Format description banner */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800/80 flex items-start gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">
              {activeFormatMeta.name}:
            </span>
            <span>{activeFormatMeta.description}</span>
          </div>

          {/* Error alert if conversion had an issue */}
          {downloadError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{downloadError}</span>
            </div>
          )}

          {/* Primary Action: Download in Selected Format */}
          <div>
            <button
              type="button"
              disabled={isConverting}
              onClick={() => handleDownload(selectedFormat, mp3Bitrate)}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm active:scale-[0.99] cursor-pointer ${downloadSuccessFormat
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : isConverting
                    ? 'bg-sky-400 text-white cursor-wait'
                    : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-sky-600/25 hover:shadow-md'
                }`}
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Converting &amp; Preparing {convertingFormat.toUpperCase()}...</span>
                </>
              ) : downloadSuccessFormat ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Downloaded {downloadSuccessFormat} to Device!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Download Audio as {activeFormatMeta.name}
                    {selectedFormat === 'mp3' ? ` (${mp3Bitrate} kbps)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Quick download other formats row */}
          <div className="pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Quick 1-click download:</span>
              <div className="flex items-center gap-1.5">
                {SUPPORTED_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={isConverting}
                    onClick={() => handleDownload(fmt.id, fmt.id === 'mp3' ? 192 : undefined)}
                    title={`Download directly as ${fmt.name} (.${fmt.ext})`}
                    className="flex items-center gap-1 text-[11px] py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300 dark:hover:border-sky-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-3 h-3 text-slate-400 group-hover:text-sky-600" />
                    <span>.{fmt.ext}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
