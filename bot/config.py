import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    bot_token: str
    admin_ids: frozenset[int]
    agents_chat_id: int | None
    db_path: str


def load_config() -> Config:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("BOT_TOKEN .env faylida ko'rsatilmagan")
    admins = frozenset(
        int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x
    )
    chat = os.getenv("AGENTS_CHAT_ID", "").strip()
    return Config(
        bot_token=token,
        admin_ids=admins,
        agents_chat_id=int(chat) if chat else None,
        db_path=os.getenv("DB_PATH", "data/bot.db"),
    )
