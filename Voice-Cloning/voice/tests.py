import base64

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from unittest.mock import patch

from .views import voice_clone


class VoiceCloneViewTests(TestCase):
    @patch('voice.views.get_voice_service')
    def test_voice_clone_returns_audio_data_for_frontend(self, mock_get_voice_service):
        mock_service = mock_get_voice_service.return_value
        mock_service.generate.side_effect = lambda **kwargs: (
            open(kwargs['output_path'], 'wb').write(b'RIFF')
        )

        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Hello world',
            'target_text': 'This is a test voice.'
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('audio_data', data)
        self.assertIn('audio_url', data)
        self.assertEqual(data['audio_url'], None)
        self.assertEqual(data['audio_base64'], data['audio_data'])
        self.assertEqual(data['audio_format'], 'wav')
        self.assertEqual(data['speed'], 1.0)
        mock_service.generate.assert_called_once()
        self.assertEqual(mock_service.generate.call_args.kwargs['speed'], 1.0)

    @patch('voice.views.get_voice_service')
    def test_voice_clone_with_custom_speed(self, mock_get_voice_service):
        mock_service = mock_get_voice_service.return_value
        mock_service.generate.side_effect = lambda **kwargs: (
            open(kwargs['output_path'], 'wb').write(b'RIFF')
        )

        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Hello world',
            'target_text': 'Speaking slower and more naturally.',
            'speed': '0.85',
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['speed'], 0.85)
        self.assertEqual(mock_service.generate.call_args.kwargs['speed'], 0.85)

    def test_voice_clone_invalid_speed_returns_400(self):
        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Hello world',
            'target_text': 'Testing invalid speed.',
            'speed': 'fast',
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('speed must be a valid number', response.json()['error'])

    def test_list_tones_returns_professional_profiles(self):
        response = self.client.get('/voice/tones/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('tones', data)
        tone_ids = [t['id'] for t in data['tones']]
        self.assertIn('formal', tone_ids)
        self.assertIn('executive', tone_ids)
        self.assertIn('broadcast', tone_ids)
        self.assertIn('narrator', tone_ids)
        self.assertIn('customer_support', tone_ids)
        self.assertIn('neutral', tone_ids)

    @patch('voice.views.get_voice_service')
    def test_voice_clone_with_executive_tone(self, mock_get_voice_service):
        mock_service = mock_get_voice_service.return_value
        mock_service.generate.side_effect = lambda **kwargs: (
            open(kwargs['output_path'], 'wb').write(b'RIFF')
        )

        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Executive address.',
            'target_text': 'Welcome to our annual leadership summit.',
            'tone': 'executive',
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['tone'], 'executive')
        self.assertEqual(data['tone_name'], 'Executive & Authoritative')
        self.assertEqual(mock_service.generate.call_args.kwargs['tone'], 'executive')

    @patch('voice.views.get_voice_service')
    def test_voice_clone_with_broadcast_tone_and_pitch(self, mock_get_voice_service):
        mock_service = mock_get_voice_service.return_value
        mock_service.generate.side_effect = lambda **kwargs: (
            open(kwargs['output_path'], 'wb').write(b'RIFF')
        )

        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Breaking news.',
            'target_text': 'Good evening, here are the top headlines for tonight.',
            'tone': 'broadcast',
            'pitch_shift': '0.5',
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['tone'], 'broadcast')
        self.assertEqual(mock_service.generate.call_args.kwargs['pitch_shift'], 0.5)

    def test_voice_clone_invalid_pitch_returns_400(self):
        payload = {
            'reference_audio': SimpleUploadedFile(
                'ref.wav',
                b'fake-audio-bytes',
                content_type='audio/wav'
            ),
            'reference_text': 'Hello world',
            'target_text': 'Testing invalid pitch.',
            'pitch_shift': 'ultra_high',
        }

        response = self.client.post('/voice/clone/', payload, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('pitch_shift must be a valid number', response.json()['error'])
