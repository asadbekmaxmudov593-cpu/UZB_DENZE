"""Javobni ovozli xabarga va matnga aylantirish (bepul Google Speech, kalitsiz)."""
import asyncio
import os

import speech_recognition as sr

CHUNK_SECONDS = 50  # bepul API bir so'rovda ~60 soniyagacha qabul qiladi


async def _ffmpeg(*args: str) -> bool:
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-loglevel", "quiet", *args,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    return await proc.wait() == 0


async def to_voice_note(src: str, dst: str) -> bool:
    """Telegram ovozli xabari formati (ogg/opus)."""
    return await _ffmpeg("-i", src, "-ac", "1", "-c:a", "libopus", "-b:a", "32k", dst)


def _recognize(wav: str, language: str) -> str:
    r = sr.Recognizer()
    parts: list[str] = []
    with sr.AudioFile(wav) as source:
        remaining = source.DURATION
        while remaining > 0.5:
            audio = r.record(source, duration=CHUNK_SECONDS)
            remaining -= CHUNK_SECONDS
            try:
                parts.append(r.recognize_google(audio, language=language))
            except sr.UnknownValueError:
                pass  # bu bo'lakda nutq aniqlanmadi
    return " ".join(parts).strip()


async def transcribe(src: str, language: str = "uz-UZ") -> str:
    wav = os.path.splitext(src)[0] + ".wav"
    if not await _ffmpeg("-i", src, "-ac", "1", "-ar", "16000", wav):
        return ""
    return await asyncio.to_thread(_recognize, wav, language)
