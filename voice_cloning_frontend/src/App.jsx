import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LanguageSelector, { INDICF5_LANGUAGES } from './components/LanguageSelector';
import AudioUpload from './components/AudioUpload';
import TextInputCard from './components/TextInputCard';
import VoiceControlsCard from './components/VoiceControlsCard';
import AudioResultCard from './components/AudioResultCard';
import ErrorAlert from './components/ErrorAlert';
import ErrorBoundary from './components/ErrorBoundary';
import VoiceSynthesisProgress from './components/VoiceSynthesisProgress';
import { useSynthesisProgress } from './hooks/useSynthesisProgress';
import { ThemeProvider } from './context/ThemeContext';
import { cloneVoice, DEFAULT_API_BASE } from './services/api';
import { classifyError, ErrorCategory } from './utils/errors';
import { createSampleWavFile } from './utils/sampleAudio';
import { recordActualSynthesisTime } from './utils/timeEstimator';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

function VoiceStudioContent() {
  const [referenceAudio, setReferenceAudio] = useState(null);
  const [referenceText, setReferenceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [backendUrl, setBackendUrl] = useState(() => {
    return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;
  });

  // Voice control parameters (new backend features)
  const [speed, setSpeed] = useState(1.0);
  const [tone, setTone] = useState('neutral');
  const [pitchShift, setPitchShift] = useState(0.0);
  const [cfgStrength, setCfgStrength] = useState(2.0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Structured error metadata for rich ErrorAlert display
  const [errorMeta, setErrorMeta] = useState({ category: null, hint: null });
  const [generationResult, setGenerationResult] = useState(null);
  const [lastTargetText, setLastTargetText] = useState('');

  const previousAudioUrlRef = useRef(null);

  // Hook for live voice generation progress bar & pipeline metrics
  const {
    progress,
    elapsedSeconds,
    estimatedTotalSeconds,
    isCompleting,
    triggerCompletion,
    resetProgress,
  } = useSynthesisProgress({
    isLoading,
    targetText,
    speed,
  });

  // Clean up Blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
    };
  }, []);

  // Auto fill sample text and demo audio
  const handleFillSample = () => {
    setReferenceText(
      'Never regret a day in your life: good days give happiness, bad days give experience.'
    );
    setTargetText(
      'Hello and welcome! This cloned voice was synthesized smoothly through the IndicF5 voice cloning service.'
    );

    // If no audio is selected, create a lightweight demo WAV file
    if (!referenceAudio) {
      const demoFile = createSampleWavFile('demo_sample_voice.wav');
      setReferenceAudio(demoFile);
    }
  };

  // Preview generated result card immediately with realistic live progress demo
  const handlePreviewSampleResult = async () => {
    setError(null);
    setGenerationResult(null);
    setIsLoading(true);

    const demoWav = createSampleWavFile('demo_speech_output.wav');
    const demoUrl = URL.createObjectURL(demoWav);

    const sampleQuote =
      targetText.trim() ||
      'Hello and welcome! This cloned voice was synthesized smoothly through the IndicF5 voice cloning service.';

    // Run a brief simulated synthesis (2.2s) so demo preview demonstrates the live progress bar in action
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      await Promise.race([
        triggerCompletion(),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      // Non-fatal animation error
    }

    if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
    }
    previousAudioUrlRef.current = demoUrl;

    setGenerationResult({
      audioUrl: demoUrl,
      blob: demoWav,
      audioFormat: 'wav',
      audioSizeBytes: demoWav.size,
      message: 'Demo Voice Generated (Ready for Multi-Format Download)',
    });
    setLastTargetText(sampleQuote);
    setIsLoading(false);
  };

  const handleReset = () => {
    if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
    }
    resetProgress();
    setGenerationResult(null);
    setError(null);
    setErrorMeta({ category: null, hint: null });
  };

  const handleToneChange = (newTone) => {
    setTone(newTone);
    // If an existing audio result from a previous tone exists, clear it so user starts fresh
    if (generationResult) {
      if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
        previousAudioUrlRef.current = null;
      }
      setGenerationResult(null);
      resetProgress();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!referenceAudio) {
      setError('Please upload or select a reference audio file first.');
      return;
    }
    if (!referenceText.trim()) {
      setError('Please enter the reference text corresponding to the audio clip.');
      return;
    }
    if (!targetText.trim()) {
      setError('Please enter the target text you want to generate in the cloned voice.');
      return;
    }

    // Clean up previous audio blob URL
    if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
      previousAudioUrlRef.current = null;
    }

    // Reset progress ticker to 0% and clear previous result before starting new run
    resetProgress();
    setGenerationResult(null);
    setIsLoading(true);
    setError(null);
    setErrorMeta({ category: null, hint: null });

    try {
      const result = await cloneVoice({
        referenceAudio,
        referenceText,
        targetText,
        language: selectedLanguage,
        speed,
        tone,
        pitchShift,
        cfgStrength,
        apiBaseUrl: backendUrl,
      });

      // Smooth progress completion transition to 100%
      try {
        await Promise.race([
          triggerCompletion(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (animErr) {
        console.warn('Completion animation note:', animErr);
      }

      // Revoke previous blob if existing to free memory
      if (previousAudioUrlRef.current && previousAudioUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
      previousAudioUrlRef.current = result.audioUrl;

      setGenerationResult(result);
      setLastTargetText(targetText.trim());

      // Update hardware performance calibration with actual measured time
      recordActualSynthesisTime(elapsedSeconds, targetText);
    } catch (err) {
      // Classify to get category + hint for rich error display
      const classified = classifyError(err, 'handleSubmit');
      // Silently ignore abort errors (user cancelled or re-triggered)
      if (classified.category === ErrorCategory.ABORT || err?.name === 'AbortError') return;

      console.error('Voice cloning error:', err);
      resetProgress();
      setError(classified.message);
      setErrorMeta({ category: classified.category, hint: classified.hint });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = Boolean(referenceAudio && referenceText.trim() && targetText.trim());
  const activeLang = INDICF5_LANGUAGES.find((l) => l.code === selectedLanguage);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar with Title and Dark Mode Toggle in Right Corner */}
      <Header backendUrl={backendUrl} onUpdateBackendUrl={setBackendUrl} />

      {/* Language strip – sticky bar beneath header */}
      <LanguageSelector
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Intro banner */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/60 text-xs font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeLang ? `${activeLang.flag} ${activeLang.label} (${activeLang.native})` : ''}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clone Any Voice in Seconds
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Provide a short reference audio sample, specify its transcript, and enter new text to synthesize speech in the cloned voice style.
          </p>
        </div>

        {/* Error notification */}
        <ErrorAlert
          error={error}
          category={errorMeta.category}
          hint={errorMeta.hint}
          onDismiss={() => { setError(null); setErrorMeta({ category: null, hint: null }); }}
          onRetry={error ? handleSubmit : undefined}
          backendUrl={backendUrl}
        />

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Reference Audio Upload */}
          <AudioUpload
            file={referenceAudio}
            onFileSelect={(file) => {
              setReferenceAudio(file);
              setError(null);
            }}
            onRemoveFile={() => setReferenceAudio(null)}
            onError={(msg) => setError(msg)}
          />

          {/* Step 2 & 3: Reference Text & Target Text */}
          <TextInputCard
            referenceText={referenceText}
            onChangeReferenceText={(val) => {
              setReferenceText(val);
              if (error) setError(null);
            }}
            targetText={targetText}
            onChangeTargetText={(val) => {
              setTargetText(val);
              if (error) setError(null);
            }}
            onFillSample={handleFillSample}
            onPreviewSampleResult={handlePreviewSampleResult}
            speed={speed}
          />

          {/* Step 4: Voice Controls (Speed, Tone, Pitch, CFG) */}
          <VoiceControlsCard
            speed={speed}
            onSpeedChange={setSpeed}
            tone={tone}
            onToneChange={handleToneChange}
            pitchShift={pitchShift}
            onPitchShiftChange={setPitchShift}
            cfgStrength={cfgStrength}
            onCfgStrengthChange={setCfgStrength}
            apiBaseUrl={backendUrl}
          />

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isCompleting || !isFormValid}
              className={`w-full relative overflow-hidden flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-semibold text-base transition-all duration-200 shadow-soft ${
                isLoading || isCompleting
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : isFormValid
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-sky-500/25 hover:shadow-lg active:scale-[0.99] cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {/* Progress background fill on button during synthesis */}
              {(isLoading || isCompleting) && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-sky-500/15 dark:bg-sky-400/20 transition-all duration-300 ease-out pointer-events-none"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              )}

              {(isLoading || isCompleting) && !generationResult ? (
                <div className="relative z-10 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-600 dark:text-sky-400" />
                  <span>
                    Synthesizing Voice... {Math.round(progress)}% ({elapsedSeconds}s / ~{estimatedTotalSeconds}s)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  <span>
                    Generate Voice
                    {targetText.trim().length > 0 && !isLoading && (
                      <span className="ml-1 text-xs font-normal opacity-90 font-mono">
                        (~{estimatedTotalSeconds}s)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </button>

            {/* Helper tips below submit button */}
            {!isFormValid && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
                {!referenceAudio
                  ? '• Please upload a reference audio file'
                  : !referenceText.trim()
                    ? '• Please enter reference audio text'
                    : '• Please enter target text to generate'}
              </p>
            )}
          </div>
        </form>

        {/* Live Generation Progress Bar Card */}
        {(isLoading || isCompleting) && !generationResult && (
          <VoiceSynthesisProgress
            progress={progress}
            elapsedSeconds={elapsedSeconds}
            estimatedTotalSeconds={estimatedTotalSeconds}
            targetText={targetText}
          />
        )}

        {/* Output Section: Generated Audio Preview & Download */}
        {generationResult && (
          <AudioResultCard
            key={generationResult.audioUrl}
            audioUrl={generationResult.audioUrl}
            audioBlob={generationResult.blob}
            audioFormat={generationResult.audioFormat}
            audioSizeBytes={generationResult.audioSizeBytes}
            message={generationResult.message}
            targetText={lastTargetText}
            onReset={handleReset}
            toneName={generationResult.toneName}
            speed={generationResult.speed}
            cfgStrength={generationResult.cfgStrength}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500 mt-12 transition-colors duration-200">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} VoiceClone Studio</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <VoiceStudioContent />
    </ThemeProvider>
  );
}
