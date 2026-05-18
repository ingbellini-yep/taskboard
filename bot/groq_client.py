"""Trascrizione audio via Groq Whisper."""
from __future__ import annotations

import io
from groq import Groq
from .config import GROQ_API_KEY

_client: Groq | None = None


def _groq() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.ogg") -> str:
    """
    Invia audio a Groq Whisper e restituisce la trascrizione.
    filename deve avere estensione riconoscibile (.ogg, .mp3, .wav, .m4a).
    """
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    result = _groq().audio.transcriptions.create(
        model="whisper-large-v3",
        file=audio_file,
        language="it",
        response_format="text",
    )
    # result è stringa con response_format="text"
    return str(result).strip()
