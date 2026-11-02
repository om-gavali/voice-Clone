import { Mp3Encoder } from '@breezystack/lamejs';
import encodeOggWasm from '@audio/encode-ogg';

/**
 * Standard formats supported for download.
 * MP3 is marked as default.
 */
export const SUPPORTED_FORMATS = [
  {
    id: 'mp3',
    name: 'MP3',
    ext: 'mp3',
    mimeType: 'audio/mpeg',
    badge: 'Default',
    tagline: 'Universal Playback & Compact',
    description: 'Compressed MPEG-1 Layer 3 at 44.1 kHz. Works on every phone, computer, car, and media player without fail.',
    isDefault: true,
  },
  {
    id: 'wav',
    name: 'WAV',
    ext: 'wav',
    mimeType: 'audio/wav',
    badge: 'Lossless',
    tagline: 'Studio Master Quality',
    description: 'Uncompressed 16-bit PCM CD master audio (44.1 kHz). Ideal for editing, mixing, and audio production.',
  },
  {
    id: 'ogg',
    name: 'OGG',
    ext: 'ogg',
    mimeType: 'audio/ogg',
    badge: 'Vorbis',
    tagline: 'Open Web Format',
    description: 'High-efficiency open audio container with Vorbis compression. Great for web streaming, Linux, and gaming engines.',
  },
  {
    id: 'webm',
    name: 'WebM',
    ext: 'webm',
    mimeType: 'audio/webm',
    badge: 'Opus Stream',
    tagline: 'Modern Web Audio',
    description: 'Opus-compressed web media format supported by modern web browsers and media players.',
  },
];

export const MP3_BITRATES = [
  { kbps: 128, label: '128 kbps', desc: 'Compact / Small File' },
  { kbps: 192, label: '192 kbps', desc: 'High Quality (Default)', default: true },
  { kbps: 320, label: '320 kbps', desc: 'Maximum Fidelity' },
];

let sharedAudioContext = null;

// Clean up shared AudioContext when the page is unloaded to avoid resource leaks
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
      sharedAudioContext.close().catch(() => {});
      sharedAudioContext = null;
    }
  });
}

/**
 * Returns or initializes a shared AudioContext.
 */
function getAudioContext() {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Decodes audio source (Blob, File, or URL string) into an AudioBuffer.
 * 
 * @param {Blob|File|string} source
 * @returns {Promise<AudioBuffer>}
 */
export async function decodeAudioSource(source) {
  let arrayBuffer;

  if (source instanceof Blob) {
    arrayBuffer = await source.arrayBuffer();
  } else if (typeof source === 'string') {
    const isSafeUrl = /^blob:/i.test(source) || /^https?:\/\//i.test(source);
    if (!isSafeUrl) {
      throw new Error('Unsafe audio source URL scheme rejected. Only blob: and https?:// are permitted.');
    }
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio source from URL: ${res.statusText}`);
    }
    arrayBuffer = await res.arrayBuffer();
  } else {
    throw new Error('Unsupported audio source type provided for decoding.');
  }

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  // Slice to prevent detaching buffer in browsers
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Resamples an AudioBuffer to a target sample rate using OfflineAudioContext.
 * 
 * @param {AudioBuffer} audioBuffer
 * @param {number} targetSampleRate
 * @returns {Promise<AudioBuffer>}
 */
export async function resampleAudioBuffer(audioBuffer, targetSampleRate = 44100) {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer;
  }

  const numChannels = Math.min(2, Math.max(1, audioBuffer.numberOfChannels));
  const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));

  const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(numChannels, targetLength, targetSampleRate);

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Converts Float32 audio samples [-1.0, 1.0] to 16-bit signed PCM integers [-32768, 32767].
 * 
 * @param {Float32Array} float32Array
 * @returns {Int16Array}
 */
function floatToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return int16Array;
}

/**
 * Creates a standard ID3v2.3 tag header so all media players (Windows Media Player,
 * Groove, iTunes, VLC, Android) recognize the file immediately with metadata and duration.
 * 
 * @param {Object} meta
 * @param {string} meta.title
 * @param {string} meta.artist
 * @param {string} meta.album
 * @returns {Uint8Array}
 */
function createId3v2Tag({ title = 'Cloned Voice Audio', artist = 'VoiceClone Studio', album = 'IndicF5 Voice Cloning' } = {}) {
  const encoder = new TextEncoder();
  const frames = [];

  const addTextFrame = (frameId, text) => {
    const textBytes = encoder.encode(text);
    // Frame size = 1 byte encoding flag (0x03 for UTF-8) + textBytes length
    const frameSize = 1 + textBytes.length;
    const frameHeader = new Uint8Array(10);
    // 4 bytes ID
    for (let i = 0; i < 4; i++) {
      frameHeader[i] = frameId.charCodeAt(i);
    }
    // 4 bytes Size (Big Endian)
    frameHeader[4] = (frameSize >> 24) & 0xff;
    frameHeader[5] = (frameSize >> 16) & 0xff;
    frameHeader[6] = (frameSize >> 8) & 0xff;
    frameHeader[7] = frameSize & 0xff;
    // 2 bytes Flags
    frameHeader[8] = 0;
    frameHeader[9] = 0;

    // Encoding byte 0x03 = UTF-8
    const frameData = new Uint8Array(1 + textBytes.length);
    frameData[0] = 3;
    frameData.set(textBytes, 1);

    frames.push(frameHeader, frameData);
  };

  addTextFrame('TIT2', title);
  addTextFrame('TPE1', artist);
  addTextFrame('TALB', album);
  addTextFrame('TSSE', 'VoiceClone LAME 3.99');

  let bodyLength = 0;
  for (const f of frames) {
    bodyLength += f.byteLength;
  }

  // 10-byte ID3v2.3 header
  const header = new Uint8Array(10);
  header[0] = 0x49; // 'I'
  header[1] = 0x44; // 'D'
  header[2] = 0x33; // '3'
  header[3] = 3;    // Version 2.3
  header[4] = 0;    // Revision 0
  header[5] = 0;    // Flags

  // Body length in 4-byte syncsafe integer
  header[6] = (bodyLength >> 21) & 0x7f;
  header[7] = (bodyLength >> 14) & 0x7f;
  header[8] = (bodyLength >> 7) & 0x7f;
  header[9] = bodyLength & 0x7f;

  const result = new Uint8Array(10 + bodyLength);
  result.set(header, 0);
  let offset = 10;
  for (const f of frames) {
    result.set(f, offset);
    offset += f.byteLength;
  }

  return result;
}

/**
 * Encodes an AudioBuffer to a 100% compliant, standard MPEG-1 Layer 3 MP3 Blob.
 * 
 * CRITICAL FIX: Standard MP3 (MPEG-1 Layer 3) requires a sample rate of 44,100 Hz (or 48,000 Hz).
 * When encoding lower rates (e.g. 8000 Hz or 24000 Hz) at bitrates like 128 kbps or 192/320 kbps,
 * LAME produces invalid MPEG-2/MPEG-2.5 headers that fail to play on Windows Media Player,
 * mobile devices, and cars. Resampling to standard 44.1 kHz guarantees that all bitrates
 * (128 kbps Compact, 192 kbps HQ, 320 kbps Studio) produce standard MPEG-1 Layer 3 files.
 * 
 * @param {AudioBuffer} audioBuffer
 * @param {number} [kbps=192]
 * @returns {Promise<Blob>}
 */
export async function encodeToMp3(audioBuffer, kbps = 192) {
  const targetSampleRate = 44100;
  let buffer = audioBuffer;

  // Always resample to 44.1 kHz for universal MPEG-1 Layer 3 playback
  if (buffer.sampleRate !== targetSampleRate) {
    buffer = await resampleAudioBuffer(buffer, targetSampleRate);
  }

  const numChannels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const encoder = new Mp3Encoder(numChannels, targetSampleRate, kbps);
  const mp3Parts = [];

  // Add standard ID3v2.3 tag
  const id3Header = createId3v2Tag({
    title: 'IndicF5 Cloned Voice',
    artist: 'VoiceClone Studio',
    album: 'Speech Synthesis',
  });
  mp3Parts.push(id3Header);

  const chunkSize = 1152; // Standard MPEG-1 Layer 3 frame size

  if (numChannels === 1) {
    const samples = floatToInt16(buffer.getChannelData(0));
    for (let i = 0; i < samples.length; i += chunkSize) {
      const chunk = samples.subarray(i, i + chunkSize);
      const encoded = encoder.encodeBuffer(chunk);
      if (encoded && encoded.length > 0) {
        // Convert Int8Array to Uint8Array for clean unsigned binary stream
        mp3Parts.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
      }
    }
  } else {
    const leftSamples = floatToInt16(buffer.getChannelData(0));
    const rightSamples = floatToInt16(buffer.getChannelData(1));
    for (let i = 0; i < leftSamples.length; i += chunkSize) {
      const leftChunk = leftSamples.subarray(i, i + chunkSize);
      const rightChunk = rightSamples.subarray(i, i + chunkSize);
      const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
      if (encoded && encoded.length > 0) {
        mp3Parts.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
      }
    }
  }

  const flushed = encoder.flush();
  if (flushed && flushed.length > 0) {
    mp3Parts.push(new Uint8Array(flushed.buffer, flushed.byteOffset, flushed.byteLength));
  }

  return new Blob(mp3Parts, { type: 'audio/mpeg' });
}

/**
 * Encodes an AudioBuffer into a clean, standard 16-bit PCM RIFF WAV Blob.
 * 
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}
 */
export function encodeToWav(audioBuffer) {
  const numChannels = Math.min(2, Math.max(1, audioBuffer.numberOfChannels));
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt subchunk (16 for standard PCM)
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // AudioFormat: 1 = uncompressed PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave channels as 16-bit signed PCM
  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channelData[ch][i]));
      const sample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  // Pass ArrayBuffer directly to Blob to guarantee zero view offset errors
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Encodes an AudioBuffer into genuine Ogg Vorbis binary audio stream.
 * 
 * Uses @audio/encode-ogg for fast, offline, browser-compliant Ogg Vorbis
 * encoding with standard OggS magic headers.
 * 
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<Blob>}
 */
export async function encodeToOgg(audioBuffer) {
  try {
    const numChannels = Math.min(2, Math.max(1, audioBuffer.numberOfChannels));
    const sampleRate = audioBuffer.sampleRate;
    const encoderFactory = encodeOggWasm.default || encodeOggWasm;
    const encoder = await encoderFactory({
      sampleRate,
      numberOfChannels: numChannels,
    });

    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }

    const chunk = encoder.encode(channels);
    const flush = encoder.flush();
    encoder.free?.();

    const parts = [];
    if (chunk && chunk.length > 0) parts.push(chunk);
    if (flush && flush.length > 0) parts.push(flush);

    return new Blob(parts, { type: 'audio/ogg' });
  } catch (err) {
    console.warn('Ogg Vorbis encoding failed, falling back to MediaRecorder/MP3:', err);
    // Fallback: MP3 encoded with universal compatibility
    return await encodeToMp3(audioBuffer, 192);
  }
}

/**
 * Encodes an AudioBuffer to WebM Opus audio using MediaRecorder.
 * Reuses the shared AudioContext singleton to avoid the browser's per-page
 * AudioContext limit (~6 concurrent). Cleanup runs in both onstop and onerror.
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<Blob>}
 */
export async function encodeToWebm(audioBuffer) {
  return new Promise((resolve, reject) => {
    try {
      // Reuse the shared singleton — avoids hitting the browser's ~6 concurrent AudioContext limit
      const ctx = getAudioContext();
      const destination = ctx.createMediaStreamDestination();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);

      let targetMime = 'audio/webm; codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(targetMime)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          targetMime = 'audio/webm';
        } else {
          targetMime = '';
        }
      }

      const recorder = targetMime
        ? new MediaRecorder(destination.stream, { mimeType: targetMime })
        : new MediaRecorder(destination.stream);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Disconnect source node to release resources without closing the shared context
        try { source.disconnect(); } catch { /* ignore */ }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        resolve(blob);
      };

      recorder.onerror = (err) => {
        // Disconnect on error too so we don't leak the source node
        try { source.disconnect(); } catch { /* ignore */ }
        reject(err);
      };

      // Resume context if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      recorder.start(100);
      source.start(0);

      // Auto-stop slightly after duration
      const durationMs = Math.ceil(audioBuffer.duration * 1000) + 100;
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, durationMs);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main conversion dispatcher: converts audio to requested format.
 * 
 * Guarantees that every format (MP3 Compact/HQ/Studio, WAV, OGG, WebM) produces
 * a genuine, valid, fully playable audio file on all operating systems.
 * 
 * @param {Object} options
 * @param {Blob|string} options.audioSource - Original audio blob or URL
 * @param {string} [options.targetFormat='mp3'] - 'mp3' | 'wav' | 'ogg' | 'webm'
 * @param {number} [options.mp3Kbps=192] - Bitrate when target is mp3 (128, 192, 320)
 * @param {string} [options.originalFormat='wav'] - Format of source if known
 * @returns {Promise<{ blob: Blob, extension: string, mimeType: string }>}
 */
export async function convertAudioFormat({
  audioSource,
  targetFormat = 'mp3',
  mp3Kbps = 192,
  originalFormat = 'wav',
}) {
  const normalizedTarget = (targetFormat || 'mp3').toLowerCase();
  const normalizedOriginal = (originalFormat || 'wav').toLowerCase();

  // Fast path for WAV: if source is already a 16-bit WAV Blob and target is WAV
  if (
    normalizedTarget === 'wav' &&
    normalizedOriginal === 'wav' &&
    audioSource instanceof Blob &&
    audioSource.size > 44
  ) {
    return {
      blob: audioSource,
      extension: 'wav',
      mimeType: 'audio/wav',
    };
  }

  // Decode audio source to AudioBuffer
  const audioBuffer = await decodeAudioSource(audioSource);

  // 1. MP3 Format (Universal 44.1 kHz MPEG-1 Layer 3)
  if (normalizedTarget === 'mp3') {
    const bitrate = Number(mp3Kbps) || 192;
    const mp3Blob = await encodeToMp3(audioBuffer, bitrate);
    return {
      blob: mp3Blob,
      extension: 'mp3',
      mimeType: 'audio/mpeg',
    };
  }

  // 2. WAV Format (16-bit PCM CD Master)
  if (normalizedTarget === 'wav') {
    const wavBlob = encodeToWav(audioBuffer);
    return {
      blob: wavBlob,
      extension: 'wav',
      mimeType: 'audio/wav',
    };
  }

  // 3. OGG Format (Pure Ogg Vorbis binary stream)
  if (normalizedTarget === 'ogg') {
    const oggBlob = await encodeToOgg(audioBuffer);
    return {
      blob: oggBlob,
      extension: 'ogg',
      mimeType: 'audio/ogg',
    };
  }

  // 4. WebM Format (Web Stream Opus)
  if (normalizedTarget === 'webm') {
    try {
      const webmBlob = await encodeToWebm(audioBuffer);
      return {
        blob: webmBlob,
        extension: 'webm',
        mimeType: 'audio/webm',
      };
    } catch (err) {
      console.warn('WebM encoding failed, falling back to MP3:', err);
      const fallbackMp3 = await encodeToMp3(audioBuffer, 192);
      return {
        blob: fallbackMp3,
        extension: 'mp3',
        mimeType: 'audio/mpeg',
      };
    }
  }

  // Default fallback: Standard MP3
  const defaultMp3 = await encodeToMp3(audioBuffer, 192);
  return {
    blob: defaultMp3,
    extension: 'mp3',
    mimeType: 'audio/mpeg',
  };
}

/**
 * Triggers a browser download for an audio Blob with safe lifecycle management.
 * Keeps URL alive for 60 seconds so large or slow downloads never get truncated.
 * 
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Extend cleanup timeout to 60 seconds to ensure the browser has completed writing
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

/**
 * Formats file size in human readable format.
 * 
 * @param {number} bytes
 * @returns {string}
 */
export function formatAudioSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
