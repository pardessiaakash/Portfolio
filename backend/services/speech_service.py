"""
services/speech_service.py

Speech-to-Text service that supports:
    1. OpenAI Whisper API (when LLM_PROVIDER=openai and API key is set)
    2. Mock fallback (returns placeholder text for testing without API)

Usage:
    service = SpeechService()
    text = service.transcribe(audio_file_path)
"""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("services")


class SpeechService:
    """
    Handles audio → text conversion.
    Automatically picks the best available backend.
    """

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        logger.info(f"SpeechService initialized | provider='{self.provider}'")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio file to text.

        Args:
            audio_file_path: Absolute path to the saved audio file

        Returns:
            Transcribed text string
        """
        logger.info(f"Transcribing audio: {audio_file_path}")

        if self.provider == "openai" and self.openai_api_key:
            return self._transcribe_with_whisper(audio_file_path)
        else:
            logger.warning(
                "Whisper not available (no OpenAI key or non-OpenAI provider). "
                "Using mock transcription."
            )
            return self._mock_transcription(audio_file_path)

    # ------------------------------------------------------------------
    # Backends
    # ------------------------------------------------------------------

    def _transcribe_with_whisper(self, audio_file_path: str) -> str:
        """
        Use OpenAI Whisper API for speech-to-text.
        Requires OPENAI_API_KEY to be set.
        """
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.openai_api_key)

            with open(audio_file_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text",
                )

            transcription = response.strip()
            logger.info(f"Whisper transcription: '{transcription[:80]}'")
            return transcription

        except FileNotFoundError:
            logger.error(f"Audio file not found: {audio_file_path}")
            raise ValueError(f"Audio file not found: {audio_file_path}")
        except Exception as e:
            logger.error(f"Whisper API error: {e}")
            raise RuntimeError(f"Speech-to-text failed: {str(e)}")

    def _mock_transcription(self, audio_file_path: str) -> str:
        """
        Mock transcription for testing / when Whisper is not available.
        Returns a fixed placeholder text so development can continue.
        """
        file_name = Path(audio_file_path).name
        mock_text = f"[Mock transcription] Audio file '{file_name}' received. Please configure OpenAI Whisper for real transcription."
        logger.warning(f"Returning mock transcription: '{mock_text}'")
        return mock_text
