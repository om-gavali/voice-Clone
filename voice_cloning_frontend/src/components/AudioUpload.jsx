import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, X, FileAudio } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = /\.(wav|mp3|m4a|ogg|flac)$/i;

/**
 * Returns true only when the File passes both MIME-type and extension checks.
 * - If the browser provides a non-empty type, it MUST start with "audio/".
 * - The filename extension must be in the allow-list.
 * This prevents renaming e.g. malicious.exe → malicious.wav.
 */
function isAudioFile(f) {
  const hasType = f.type && f.type.length > 0;
  if (hasType && !f.type.startsWith('audio/')) return false;
  return ALLOWED_EXTENSIONS.test(f.name);
}

export default function AudioUpload({ file, onFileSelect, onRemoveFile, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Generate preview object URL whenever file changes
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndSelect = (selected) => {
    if (!isAudioFile(selected)) {
      if (onError) onError('Invalid file type. Please upload an audio file (.wav, .mp3, .m4a, .ogg, .flac).');
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      if (onError) onError(`File is too large (${(selected.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
      return;
    }
    onFileSelect(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSelect(droppedFiles[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
      // Reset input so the same file can be re-selected after removal
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors duration-200">
      {/*
        Single hidden file input rendered unconditionally so `fileInputRef` always
        points to the same stable DOM node — fixes the dual-ref React anti-pattern
        where the same ref was assigned to two different inputs in alternating branches.
      */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-xs font-bold">
            1
          </span>
          Reference Audio File
          <span className="text-rose-500 font-bold">*</span>
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          WAV, MP3, M4A, OGG
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Upload a clear recording of the voice you want to clone (3 to 15 seconds works best).
      </p>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-sky-500 dark:border-sky-400 bg-sky-50/60 dark:bg-sky-950/40 scale-[1.01]'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50/20 dark:hover:bg-slate-800/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-sky-100/80 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports .wav, .mp3, .m4a (Max 25MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)} • {file.type || 'audio'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/70 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={onRemoveFile}
                title="Remove audio"
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reference Audio Player Preview */}
          {previewUrl && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Reference Audio Preview
              </span>
              <audio controls src={previewUrl} className="w-full h-9 rounded-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
