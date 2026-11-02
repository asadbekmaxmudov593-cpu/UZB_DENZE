"""Free Uzbek text-to-speech via Microsoft Edge voices (edge-tts, no API key)."""
import asyncio
import json

import edge_tts

# Telegramda ko'p uchraydigan turkcha/lotin harflarini o'zbek lotin yozuviga keltirish
_REPLACE = {
    "ğ": "gʻ", "Ğ": "Gʻ", "ş": "sh", "Ş": "Sh", "ç": "ch", "Ç": "Ch",
    "ı": "i", "ö": "oʻ", "Ö": "Oʻ", "ü": "u", "Ü": "U",
    "o'": "oʻ", "O'": "Oʻ", "g'": "gʻ", "G'": "Gʻ", "o`": "oʻ", "g`": "gʻ",
}


def normalize_uz(text: str) -> str:
    for src, dst in _REPLACE.items():
        text = text.replace(src, dst)
    return text


async def synthesize(text: str, path: str, voice: str) -> None:
    await edge_tts.Communicate(normalize_uz(text), voice, rate="-10%").save(path)


async def audio_duration(path: str) -> float:
    """Duration in seconds using ffprobe (ffmpeg is required by py-tgcalls anyway)."""
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path,
        stdout=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    try:
        return float(json.loads(out)["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return 30.0
