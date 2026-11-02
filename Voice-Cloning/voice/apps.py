from django.apps import AppConfig


class VoiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'voice'

    def ready(self):
        from .voice_cloning_service import get_voice_service
        get_voice_service()
