import base64
import tempfile
import uuid
from pathlib import Path

from django.http import JsonResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser

from .voice_cloning_service import (
    get_voice_service,
    PROFESSIONAL_TONES,
    TONE_ALIASES,
)


def _delete_file(path):
    if not path:
        return
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass


@api_view(["GET"])
def list_tones(request):
    """
    Returns list of available professional tone presets with descriptions.
    """
    tones = [
        {
            "id": key,
            "name": meta["name"],
            "description": meta["description"],
            "default_cfg": meta["cfg_strength"],
            "pitch_shift": meta["pitch_shift"],
        }
        for key, meta in PROFESSIONAL_TONES.items()
    ]
    return JsonResponse({"tones": tones})


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def voice_clone(request):

    reference_audio = request.FILES.get("reference_audio")
    reference_text = request.data.get("reference_text")
    target_text = request.data.get("target_text")
    speed_raw = request.data.get("speed", 1.0)
    tone_raw = request.data.get("tone", "neutral")
    cfg_raw = request.data.get("cfg_strength")
    pitch_raw = request.data.get("pitch_shift")

    if not reference_audio:
        return JsonResponse({"error": "reference_audio is required"}, status=400)

    if not reference_text:
        return JsonResponse({"error": "reference_text is required"}, status=400)

    if not target_text:
        return JsonResponse({"error": "target_text is required"}, status=400)

    # Validate speed parameter (0.3 to 2.5, default 1.0)
    try:
        speed = float(speed_raw)
        if not (0.3 <= speed <= 2.5):
            return JsonResponse(
                {"error": "speed must be between 0.3 and 2.5 (e.g., 0.85 for slower/relaxed, 1.0 for normal, 1.25 for faster)"},
                status=400
            )
    except (ValueError, TypeError):
        return JsonResponse(
            {"error": "speed must be a valid number (e.g., 0.85, 1.0, 1.2)"},
            status=400
        )

    # Resolve professional tone preset
    tone_key = TONE_ALIASES.get(str(tone_raw).lower().strip(), "neutral")

    # Optional pitch shift in semitones (e.g. -2.0 to +2.0)
    pitch_shift = None
    if pitch_raw is not None and str(pitch_raw).strip() != "":
        try:
            pitch_shift = float(pitch_raw)
            if not (-6.0 <= pitch_shift <= 6.0):
                return JsonResponse({"error": "pitch_shift must be between -6.0 and +6.0 semitones"}, status=400)
        except (ValueError, TypeError):
            return JsonResponse({"error": "pitch_shift must be a valid number (e.g., -1.2, 0.0, 1.0)"}, status=400)

    # Optional custom classifier-free guidance override
    cfg_strength = None
    if cfg_raw is not None and str(cfg_raw).strip() != "":
        try:
            cfg_val = float(cfg_raw)
            if 1.0 <= cfg_val <= 3.5:
                cfg_strength = cfg_val
        except (ValueError, TypeError):
            pass

    reference_path = None
    output_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as reference_file:
            for chunk in reference_audio.chunks():
                reference_file.write(chunk)
            reference_path = Path(reference_file.name)

        output_path = Path(tempfile.gettempdir()) / f"vc_output_{uuid.uuid4().hex}.wav"

        get_voice_service().generate(
            reference_audio=reference_path,
            reference_text=reference_text,
            target_text=target_text,
            output_path=output_path,
            speed=speed,
            tone=tone_key,
            cfg_strength=cfg_strength,
            pitch_shift=pitch_shift,
        )

        audio_bytes = output_path.read_bytes()
        audio_data = base64.b64encode(audio_bytes).decode('utf-8')

        active_cfg = cfg_strength or PROFESSIONAL_TONES[tone_key]["cfg_strength"]

        return JsonResponse({
            "message": "Voice generated successfully",
            "audio_url": None,
            "audio_data": audio_data,
            "audio_base64": audio_data,
            "audio_format": "wav",
            "audio_size_bytes": len(audio_bytes),
            "speed": speed,
            "tone": tone_key,
            "tone_name": PROFESSIONAL_TONES[tone_key]["name"],
            "cfg_strength": active_cfg,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    finally:
        for path in (reference_path, output_path):
            _delete_file(path)
