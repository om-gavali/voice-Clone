# Voice Cloning Backend Documentation

## 1. Overview

This project is a Django-based backend for voice cloning using the IndicF5 model from Hugging Face. It exposes a REST API that accepts:

- a reference audio file,
- the transcript of that reference audio,
- the target text to be spoken in the cloned voice.

The backend loads a pretrained F5-TTS model, performs inference, and returns generated speech audio.

---

## 2. Tech Stack

- Python 3.11+
- Django 5.2
- Django REST Framework
- PyTorch
- TorchAudio
- Hugging Face Hub
- Safetensors
- SoundFile
- NumPy

---

## 3. Project Structure

```text
Voice-Cloning/
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── voice/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── tests.py
│   ├── views.py
│   ├── voice_cloning_service.py
│   └── migrations/
├── media/
│   ├── generated/
│   └── reference/
├── manage.py
├── requirements.txt
├── db.sqlite3
├── BACKEND_DOCUMENTATION.md
└── venv/
```

---

## 4. Main Backend Flow

### Request entry point
The backend API route is defined in `config/urls.py`:

```python
path('voice/clone/', voice_clone, name='voice_clone')
```

### Request handling
The API is implemented in `voice/views.py`.

It expects a multipart form request with:

- `reference_audio` (required)
- `reference_text` (required)
- `target_text` (required)

### Model execution
The actual inference is executed in `voice/voice_cloning_service.py`.

The service loads:

- the F5-TTS model architecture,
- the model checkpoint from Hugging Face,
- the vocoder for waveform reconstruction,
- and runs inference with the uploaded reference audio and target text.

---

## 5. API Contract

### Endpoint
`POST /voice/clone/`

### Content-Type
`multipart/form-data`

### Request fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `reference_audio` | file | Yes | Audio sample that defines the voice style |
| `reference_text` | string | Yes | Transcript matching the reference audio |
| `target_text` | string | Yes | Text to generate in the cloned voice |
| `speed` | float | No | Voice speed multiplier (`0.3` to `2.5`, default: `1.0`). Use `< 1.0` (e.g. `0.85`) for slower/relaxed, `> 1.0` (e.g. `1.25`) for faster. |
| `tone` | string | No | Professional tone preset (default: `neutral`). Options: `formal`, `executive`, `broadcast`, `narrator`, `customer_support`, `neutral`. |
| `pitch_shift` | float | No | Optional semitone pitch shift (`-6.0` to `+6.0`, e.g. `-1.2` for deeper, `+1.0` for higher). Overrides preset default. |
| `cfg_strength` | float | No | Classifier-free guidance scale (`1.0` to `3.5`). Defaults to the selected tone's calibrated setting. |

### Success Response

```json
{
  "message": "Voice generated successfully",
  "audio_url": null,
  "audio_data": "base64-encoded-wav-data",
  "audio_base64": "base64-encoded-wav-data",
  "audio_format": "wav",
  "audio_size_bytes": 12345,
  "speed": 1.0,
  "tone": "executive",
  "tone_name": "Executive & Authoritative",
  "cfg_strength": 2.2
}
```

### Error Response

```json
{
  "error": "reference_audio is required"
}
```

or

```json
{
  "error": "speed must be between 0.3 and 2.5 (e.g., 0.85 for slower/relaxed, 1.0 for normal, 1.25 for faster)"
}
```

or

```json
{
  "error": "pitch_shift must be between -6.0 and +6.0 semitones"
}
```

or

```json
{
  "error": "something went wrong during generation"
}
```

---

### Endpoint
`GET /voice/tones/`

Returns all available professional tone presets, their descriptions, default CFG scale, and pitch shift settings.

#### Response

```json
{
  "tones": [
    {
      "id": "formal",
      "name": "Corporate & Formal",
      "description": "Clear, articulate, balanced delivery ideal for business meetings, training, and presentations.",
      "default_cfg": 2.0,
      "pitch_shift": 0.0
    },
    {
      "id": "executive",
      "name": "Executive & Authoritative",
      "description": "Deep, commanding, steady presence with chest resonance for leadership and keynotes.",
      "default_cfg": 2.2,
      "pitch_shift": -1.2
    },
    {
      "id": "broadcast",
      "name": "News & Media Broadcast",
      "description": "Dynamic, articulate, high-clarity broadcast standard for news reporting and media.",
      "default_cfg": 2.4,
      "pitch_shift": 0.3
    },
    {
      "id": "narrator",
      "name": "Documentary & Storyteller",
      "description": "Warm, immersive, rich cadence with subtle high-end smoothing for long-form listening.",
      "default_cfg": 1.9,
      "pitch_shift": -0.8
    },
    {
      "id": "customer_support",
      "name": "Customer Support & Friendly",
      "description": "Welcoming, polite, empathetic, and clear delivery for client-facing communications.",
      "default_cfg": 1.8,
      "pitch_shift": 0.8
    },
    {
      "id": "neutral",
      "name": "Natural & Neutral",
      "description": "Direct neural reproduction preserving the original reference speaker style without acoustic shaping.",
      "default_cfg": 2.0,
      "pitch_shift": 0.0
    }
  ]
}
```

---

## 6. Professional Tone Profiles Overview

| Tone ID | Display Name | Acoustic Profile | Best Use Case |
|---|---|---|---|
| `formal` | Corporate & Formal | Pristine diction clarity (+1.5dB at 2.8kHz) | Business meetings, compliance, corporate training |
| `executive` | Executive & Authoritative | Low chest resonance (+2.5dB at 180Hz), -1.2 st pitch | Keynotes, leadership announcements, investor calls |
| `broadcast` | News & Media Broadcast | Broadcast warmth (+1.5dB at 200Hz), presence (+2.0dB at 3.2kHz), +0.3 st pitch | News summaries, press releases, media podcasts |
| `narrator` | Documentary & Storyteller | Warm vocal body (+2.0dB at 220Hz), silky top-end roll-off, -0.8 st pitch | Audiobooks, documentaries, case studies |
| `customer_support` | Customer Support & Friendly | Welcoming presence (+1.8dB at 3.2kHz), soft warmth, +0.8 st pitch | IVR systems, support videos, tutorials |
| `neutral` | Natural & Neutral | 100% transparent neural reproduction | General cloning, exact reference style match |

---

## 7. Response Contract Notes

The frontend originally expected an `audio_url` value when calling the API, but this backend chooses to return audio data directly as base64 payload in `audio_data` and `audio_base64`.

This is important for frontend compatibility:

- `audio_data` is the main field to use for direct playback.
- `audio_url` may be `null` in this implementation.
- `audio_base64` is kept for compatibility with older frontend logic.
- `speed` and `cfg_strength` return the active parameters used for synthesis.

### Frontend usage
The frontend should parse the response like this:

```js
const audioBase64 = response.audio_data || response.audio_base64;
```

Then convert it to a Blob and create an object URL for playback.

---

## 7. Model Information

### Model family
F5-TTS with a DiT-based architecture

### Hugging Face model source
`ai4bharat/IndicF5`

### Model files loaded
- `checkpoints/vocab.txt`
- `model.safetensors`

### Vocoder used
`vocos`

### Model configuration used
```python
DiT(
    dim=1024,
    depth=22,
    heads=16,
    ff_mult=2,
    text_dim=512,
    conv_layers=4,
)
```

### Runtime device
- CUDA if available
- otherwise CPU

This is configured in `voice/voice_cloning_service.py` using:

```python
self.device = os.getenv('INDICF5_DEVICE', 'cuda' if torch.cuda.is_available() else 'cpu')
```

---

## 8. Startup Behavior

The service is initialized once and reused, instead of creating a new model for each request.

This is handled by:

```python
def get_voice_service():
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceCloningService()
    return _voice_service
```

This prevents repeated model downloads and repeated model initialization on every request.

---

## 9. Security and Configuration

The project has been updated to use environment variables instead of hardcoded secrets/settings.

### Important settings in `config/settings.py`

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_STATIC_URL`
- `DJANGO_MEDIA_URL`
- `DJANGO_MEDIA_ROOT`
- `CORS_ALLOWED_ORIGINS`
- `INDICF5_REPO_ID`
- `INDICF5_DEVICE`

### Example environment variables

```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
INDICF5_REPO_ID=ai4bharat/IndicF5
INDICF5_DEVICE=cuda
```

---

## 10. CORS and Frontend Access

Because the React app runs on a different frontend origin, Django must allow cross-origin requests.

The relevant configuration is added in `config/settings.py` using `django-cors-headers`.

Example configuration:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

This prevents browser CORS errors when the frontend calls the backend.

---

## 11. Temporary Files and Cleanup

The backend processes audio in temporary files rather than permanently writing files to media storage for each request.

The logic uses `tempfile.NamedTemporaryFile(delete=False)` and removes the files in a `finally` block.

This ensures:

- no stale files remain after each request,
- less disk usage,
- cleaner request lifecycle.

---

## 12. Voice Speed & Human Tone Flow Optimization

To make the generated voice sound warm, expressive, and human-like rather than robotic or synthetic:

1. **Native Duration Conditioning (No Post-Vocoder Phase Distortion)**:
   - Previously, post-processing used `librosa.effects.time_stretch` on vocoded audio, which introduced metallic, tinny, hollow phase artifacts and slurred consonants.
   - We now pass `speed` directly into F5-TTS's generative flow-matching step (`infer_process(..., speed=speed)`). The diffusion model natively controls duration during spectrogram generation.
   - Pitch, vocal resonance, and formant transitions remain completely natural across any speed (0.3x to 2.5x).

2. **Text Normalization & Cadence Punctuation**:
   - F5-TTS uses punctuation to calculate breath intervals and prosodic inflection contours.
   - Text without ending punctuation often causes flat pitch or clipped trailing words.
   - All input text is preprocessed with `normalize_text_for_human_tone` to ensure clean spacing, proper breath pauses, and natural sentence terminal cadence (`.`, `!`, `?`, `…`, `।`).

3. **Audio Boundary Smoothing & Headroom Normalization**:
   - A smooth 10ms micro-fade is applied at audio boundaries to eliminate sudden onset or offset click/pop artifacts.
   - Peak audio normalization with a safety ceiling (0.95) prevents DAC inter-sample clipping and digital harshness.
   - Exported as standard 16-bit PCM WAV for universal browser and mobile playback compatibility.

---

## 13. Known Integration Issues

### 1. Frontend expects `audio_url`, backend returns `audio_data`
This was a mismatch between the frontend contract and the backend response shape.

Solution:
- use `audio_data` or `audio_base64` in frontend code,
- or update the backend to include both fields as done in the current implementation.

### 2. CORS error from frontend to backend
The browser blocks API calls when frontend and backend ports differ.

Solution:
- enable CORS in Django,
- allow the frontend origin explicitly.

### 3. Large model initialization time
The IndicF5 model and vocoder are downloaded and initialized when the Django app starts or on first access.

This can take time and memory, especially in CPU-only environments.

Recommendation:
- preload it once at startup,
- avoid creating new instances per request.

---

## 14. Example Frontend Usage

```js
const formData = new FormData();
formData.append('reference_audio', file);
formData.append('reference_text', 'This is my voice sample.');
formData.append('target_text', 'Hello everyone, this is my cloned voice.');
formData.append('speed', 1.0); // Adjust speed: e.g. 0.85 for slower, 1.0 for normal, 1.25 for faster

const response = await fetch('http://127.0.0.1:8000/voice/clone/', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
const audioBase64 = data.audio_data || data.audio_base64;

if (!audioBase64) {
  throw new Error('Backend response did not contain audio data.');
}

const binary = atob(audioBase64);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}

const blob = new Blob([bytes], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.play();
```

---

## 15. Best Practices

- Keep the model loaded once and reused.
- Never expose secrets in source code.
- Use environment variables for config.
- Clean temporary audio files after generation.
- Return predictable API responses for frontend consumption.
- Validate request files and payloads before passing them to inference.

---

## 16. Notes for Deployment

For production deployment, consider:

- using Gunicorn or Uvicorn workers,
- running behind Nginx or a reverse proxy,
- storing generated files in cloud object storage,
- using environment-based secrets management,
- running with GPU support if high throughput is needed,
- adding rate limiting and request validation for public use.

---

## 17. Quick Start

```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Then call:

```bash
curl -X POST http://127.0.0.1:8000/voice/clone/ \
  -F "reference_audio=@sample.wav" \
  -F "reference_text=This is my voice sample." \
  -F "target_text=Hello, this is my cloned voice." \
  -F "speed=1.0"
```

---

## 18. Summary

This backend is a Django voice-cloning service powered by IndicF5. It accepts voice samples, performs model inference, and returns generated speech audio. The most important integration points are:

- API endpoint: `POST /voice/clone/`
- request format: `multipart/form-data`
- response fields: `audio_data` and/or `audio_base64`
- optional controls: `speed` (0.3 - 2.5) and `cfg_strength` (1.0 - 3.5)
- CORS must be enabled for the frontend
- the model is loaded once and reused
- temp files are cleaned after each request

This file should be used as the main reference for backend/frontend integration and debugging.
