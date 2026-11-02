/**
 * Helper to generate a high-quality sample WAV audio file (44.1 kHz, 16-bit PCM)
 * for testing and immediate demo preview.
 */
export function createSampleWavFile(filename = 'sample_reference.wav') {
  // 2-second pleasant harmonic voice tone at 44.1 kHz, 16-bit PCM
  const sampleRate = 44100;
  const duration = 2.0;
  const numSamples = Math.floor(sampleRate * duration);
  const bytesPerSample = 2; // 16-bit
  const numChannels = 1; // mono
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk (16 for PCM)
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM Format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits per sample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Audio waveform: warm speech-like harmonic vocal resonance
  // Natural fundamental frequency (220 Hz / A3) + formants at 440 Hz, 880 Hz, 1320 Hz with natural envelope
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope: smooth fade-in and fade-out
    const attack = Math.min(1, t / 0.08);
    const release = Math.min(1, (duration - t) / 0.12);
    const envelope = attack * release;

    // Rich voice-like harmonic tone
    const f0 = 220; // A3 base pitch
    const wave =
      Math.sin(2 * Math.PI * f0 * t) * 0.5 +
      Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.25 +
      Math.sin(2 * Math.PI * (f0 * 3) * t) * 0.15 +
      Math.sin(2 * Math.PI * (f0 * 4) * t) * 0.08;

    const sampleFloat = wave * envelope * 0.85;
    const sampleInt16 = Math.max(-32768, Math.min(32767, Math.round(sampleFloat * 32767)));
    view.setInt16(offset, sampleInt16, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new File([blob], filename, { type: 'audio/wav', lastModified: Date.now() });
}
