import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class CallerConfig:
    api_id: int
    api_hash: str
    session: str
    contacts: dict[str, str]  # alias (lowercase) -> username / phone / id
    voice: str
    repeat: int
    ring_timeout: int
    listen_seconds: int  # 0 = javobni yozib olmaslik


def load_caller_config() -> CallerConfig:
    api_id = os.getenv("API_ID", "").strip()
    api_hash = os.getenv("API_HASH", "").strip()
    if not api_id or not api_hash:
        raise RuntimeError("API_ID va API_HASH .env faylida ko'rsatilmagan (my.telegram.org)")

    contacts: dict[str, str] = {}
    for pair in os.getenv("CALL_CONTACTS", "").split(","):
        if ":" in pair:
            alias, target = pair.split(":", 1)
            if alias.strip() and target.strip():
                contacts[alias.strip().lower()] = target.strip()
    if not contacts:
        raise RuntimeError("CALL_CONTACTS bo'sh. Masalan: CALL_CONTACTS=ada:@username")

    return CallerConfig(
        api_id=int(api_id),
        api_hash=api_hash,
        session=os.getenv("SESSION_NAME", "data/my_account"),
        contacts=contacts,
        voice=os.getenv("TTS_VOICE", "uz-UZ-SardorNeural"),
        repeat=max(1, int(os.getenv("CALL_REPEAT", "2"))),
        ring_timeout=int(os.getenv("CALL_RING_TIMEOUT", "45")),
        listen_seconds=max(0, int(os.getenv("CALL_LISTEN_SECONDS", "20"))),
    )
