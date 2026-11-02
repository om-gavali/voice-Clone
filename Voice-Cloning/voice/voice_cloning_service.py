import os
import re
import tempfile
import threading

import numpy as np
import soundfile as sf
import torch
import torchaudio.functional as AF
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

from f5_tts.model import DiT
from f5_tts.infer.utils_infer import (
    infer_process,
    load_model,
    load_vocoder,
    preprocess_ref_audio_text,
)

MODEL_CONFIG = dict(
    dim=1024,
    depth=22,
    heads=16,
    ff_mult=2,
    text_dim=512,
    conv_layers=4,
)

MEL_SPEC_TYPE = "vocos"
DEFAULT_CFG = 2.0
MIN_SPEED, MAX_SPEED = 0.3, 2.5
FADE_SECONDS = 0.01
PEAK_LEVEL = 0.95
TERMINAL_PUNCTUATION = {".", "!", "?", "…", "।", ";", ":"}

PROFESSIONAL_TONES = {
    "formal": {
        "name": "Corporate & Formal",
        "description": "Clear, articulate, balanced delivery for business meetings, training, and presentations.",
        "cfg_strength": 2.0,
        "pitch_shift": 0.0,
        "eq": [
            {"freq": 2800, "gain": 1.5, "q": 1.0},
        ],
    },
    "executive": {
        "name": "Executive & Authoritative",
        "description": "Deep, commanding, steady presence with chest resonance for leadership and keynotes.",
        "cfg_strength": 2.2,
        "pitch_shift": -1.2,
        "eq": [
            {"freq": 180, "gain": 2.5, "q": 1.0},
            {"freq": 3000, "gain": 1.0, "q": 1.0},
        ],
    },
    "broadcast": {
        "name": "News & Media Broadcast",
        "description": "Dynamic, articulate, high-clarity broadcast standard for news and media.",
        "cfg_strength": 2.4,
        "pitch_shift": 0.3,
        "eq": [
            {"freq": 200, "gain": 1.5, "q": 1.0},
            {"freq": 3200, "gain": 2.0, "q": 1.0},
        ],
    },
    "narrator": {
        "name": "Documentary & Storyteller",
        "description": "Warm, immersive, rich cadence with subtle high-end smoothing for long-form listening.",
        "cfg_strength": 1.9,
        "pitch_shift": -0.8,
        "eq": [
            {"freq": 220, "gain": 2.0, "q": 1.0},
            {"freq": 7500, "gain": -0.8, "q": 1.0},
        ],
    },
    "customer_support": {
        "name": "Customer Support & Friendly",
        "description": "Welcoming, polite, empathetic, and clear delivery for client-facing communication.",
        "cfg_strength": 1.8,
        "pitch_shift": 0.8,
        "eq": [
            {"freq": 3200, "gain": 1.8, "q": 1.0},
            {"freq": 300, "gain": 1.0, "q": 1.0},
        ],
    },
    "neutral": {
        "name": "Natural & Neutral",
        "description": "Direct reproduction preserving the reference speaker style without acoustic shaping.",
        "cfg_strength": 2.0,
        "pitch_shift": 0.0,
        "eq": [],
    },
}

_ALIASES_BY_TONE = {
    "formal": ("professional", "business", "corporate"),
    "executive": ("authoritative", "leadership"),
    "broadcast": ("news", "news_anchor", "journalism"),
    "narrator": ("documentary", "storytelling", "audiobook"),
    "customer_support": ("friendly", "support", "empathetic"),
    "neutral": ("natural", "default"),
}

TONE_ALIASES = {tone: tone for tone in PROFESSIONAL_TONES}
for _tone, _aliases in _ALIASES_BY_TONE.items():
    TONE_ALIASES.update({alias: _tone for alias in _aliases})


def resolve_tone(tone):
    return TONE_ALIASES.get(str(tone).lower().strip(), "neutral")


def to_float(value, default):
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def normalize_text_for_human_tone(text):
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if cleaned and cleaned[-1] not in TERMINAL_PUNCTUATION:
        cleaned += "."
    return cleaned


def apply_tone_profile(audio, sample_rate, tone_key, pitch_override=None):
    profile = PROFESSIONAL_TONES.get(tone_key, PROFESSIONAL_TONES["neutral"])
    semitones = to_float(pitch_override, profile.get("pitch_shift", 0.0))
    eq_bands = profile.get("eq", [])

    if semitones == 0.0 and not eq_bands:
        return audio

    waveform = torch.from_numpy(audio).unsqueeze(0)

    if semitones != 0.0:
        waveform = AF.pitch_shift(waveform, sample_rate, n_steps=semitones)

    for band in eq_bands:
        gain_db = band.get("gain", 0.0)
        if gain_db == 0.0:
            continue
        waveform = AF.equalizer_biquad(
            waveform,
            sample_rate,
            center_freq=band.get("freq", 1000),
            gain=gain_db,
            Q=band.get("q", 1.0),
        )

    return waveform.squeeze(0).numpy()


def apply_fades(audio, sample_rate):
    n = int(sample_rate * FADE_SECONDS)
    if n > 0 and len(audio) > 2 * n:
        audio[:n] *= np.linspace(0.0, 1.0, n, dtype=np.float32)
        audio[-n:] *= np.linspace(1.0, 0.0, n, dtype=np.float32)
    return audio


def peak_normalize(audio, level=PEAK_LEVEL):
    peak = np.max(np.abs(audio)) if audio.size else 0.0
    if peak > 0.0:
        audio = audio / peak * level
    return audio


class VoiceCloningService:
    def __init__(self):
        self.device = os.getenv(
            "INDICF5_DEVICE", "cuda" if torch.cuda.is_available() else "cpu"
        )
        repo_id = os.getenv("INDICF5_REPO_ID", "ai4bharat/IndicF5")

        vocab_path = hf_hub_download(repo_id=repo_id, filename="checkpoints/vocab.txt")
        ckpt_path = hf_hub_download(repo_id=repo_id, filename="model.safetensors")

        self.vocoder = load_vocoder(
            vocoder_name=MEL_SPEC_TYPE, is_local=False, device=self.device
        )
        self.model = load_model(
            DiT,
            MODEL_CONFIG,
            mel_spec_type=MEL_SPEC_TYPE,
            vocab_file=vocab_path,
            device=self.device,
        )
        self._load_weights(ckpt_path)
        self.model.eval()

        print("IndicF5 loaded")
        print("Device:", self.device)

    def _load_weights(self, ckpt_path):
        raw = load_file(ckpt_path, device=self.device)
        state_dict = {
            k.replace("ema_model._orig_mod.", ""): v
            for k, v in raw.items()
            if k.startswith("ema_model.")
        }
        result = self.model.load_state_dict(state_dict, strict=False)
        print(
            f"Weights loaded: {len(result.missing_keys)} missing, "
            f"{len(result.unexpected_keys)} unexpected keys"
        )

    def generate(
        self,
        reference_audio,
        reference_text,
        target_text,
        output_path,
        speed=1.0,
        tone="neutral",
        cfg_strength=None,
        pitch_shift=None,
        nfe_step=32,
        max_ref_seconds=10,
    ):
        tone_key = resolve_tone(tone)
        profile = PROFESSIONAL_TONES[tone_key]

        cfg = to_float(cfg_strength, profile.get("cfg_strength", DEFAULT_CFG))
        speed = max(MIN_SPEED, min(MAX_SPEED, to_float(speed, 1.0)))

        text = normalize_text_for_human_tone(target_text)
        if not text:
            raise ValueError("target_text cannot be empty")
        normalized_ref_text = normalize_text_for_human_tone(reference_text)

        ref_audio_to_use = str(reference_audio)
        temp_ref_path = None
        try:
            audio_data, sr = sf.read(ref_audio_to_use)
            duration = len(audio_data) / sr if sr > 0 else 0
            effective_duration = duration

            if duration > max_ref_seconds:
                print(
                    f"Warning: Reference audio is {duration:.1f}s, which exceeds max_ref_seconds={max_ref_seconds}s. "
                    f"Trimming reference audio to {max_ref_seconds}s. Please ensure reference_text matches only the trimmed {max_ref_seconds}s speech."
                )
                trimmed_samples = int(max_ref_seconds * sr)
                trimmed_data = audio_data[:trimmed_samples]
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                    temp_ref_path = tf.name
                sf.write(temp_ref_path, trimmed_data, sr, subtype="PCM_16")
                ref_audio_to_use = temp_ref_path
                effective_duration = max_ref_seconds

            non_space_chars = len(re.sub(r"\s+", "", normalized_ref_text))
            char_rate = non_space_chars / effective_duration if effective_duration > 0 else 0
            if char_rate > 22:
                print(
                    f"Warning: reference_text has {char_rate:.1f} non-space characters per second "
                    f"({non_space_chars} characters for {effective_duration:.1f}s audio), which exceeds the expected limit of ~22 characters/second. "
                    "Ensure reference_text matches only what is spoken in the reference audio to prevent transcript leakage into output."
                )

            safe_ref = normalized_ref_text.encode("ascii", "backslashreplace").decode("ascii")
            safe_text = text.encode("ascii", "backslashreplace").decode("ascii")
            print(
                f"IndicF5 generation: ref_audio={ref_audio_to_use} ({effective_duration:.2f}s), "
                f"ref_text={safe_ref!r}, target_text={safe_text!r}, speed={speed}, tone={tone_key}, cfg={cfg}"
            )

            ref_audio, ref_text = preprocess_ref_audio_text(
                ref_audio_to_use, normalized_ref_text, clip_short=False
            )

            ref_data, ref_sr = sf.read(ref_audio)
            silence_samples = int(ref_sr * 0.4)
            if ref_data.ndim == 1:
                padded_ref = np.concatenate([ref_data, np.zeros(silence_samples, dtype=ref_data.dtype)])
            else:
                padded_ref = np.concatenate([ref_data, np.zeros((silence_samples, ref_data.shape[1]), dtype=ref_data.dtype)], axis=0)
            sf.write(ref_audio, padded_ref, ref_sr)

            audio, sample_rate, _ = infer_process(
                ref_audio,
                ref_text,
                text,
                self.model,
                self.vocoder,
                mel_spec_type=MEL_SPEC_TYPE,
                nfe_step=nfe_step,
                cfg_strength=cfg,
                speed=speed,
                device=self.device,
            )

            audio = np.asarray(audio, dtype=np.float32)
            audio = apply_tone_profile(audio, sample_rate, tone_key, pitch_override=pitch_shift)
            audio = apply_fades(audio, sample_rate)
            audio = peak_normalize(audio)

            sf.write(output_path, audio, sample_rate, subtype="PCM_16")
            return output_path
        finally:
            if temp_ref_path:
                try:
                    os.unlink(temp_ref_path)
                except OSError:
                    pass


_voice_service = None
_voice_service_lock = threading.Lock()


def get_voice_service():
    global _voice_service
    if _voice_service is None:
        with _voice_service_lock:
            if _voice_service is None:
                _voice_service = VoiceCloningService()
    return _voice_service