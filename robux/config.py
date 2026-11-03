import os
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class ShopConfig:
    bot_token: str
    admin_ids: frozenset[int]
    card: str
    card_holder: str
    support: str
    db_path: str
    shop_name: str
    ai_model: str | None  # None = AI o'chirilgan
    ai_daily_limit: int
    open_at: time
    close_at: time

    @property
    def hours(self) -> str:
        return f"{self.open_at:%H:%M} – {self.close_at:%H:%M}"

    def is_open(self) -> bool:
        now = datetime.now(_tz()).time()
        if self.open_at <= self.close_at:
            return self.open_at <= now <= self.close_at
        return now >= self.open_at or now <= self.close_at  # yarim tundan o'tadigan jadval


def _tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(os.getenv("SHOP_TIMEZONE", "Asia/Tashkent"))
    except Exception:
        return timezone(timedelta(hours=5))  # Toshkent: UTC+5


def _hhmm(value: str) -> time:
    h, m = value.strip().split(":")
    return time(int(h), int(m))


def load_shop_config() -> ShopConfig:
    token = os.getenv("ROBUX_BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("ROBUX_BOT_TOKEN .env faylida ko'rsatilmagan (@BotFather)")
    admins = frozenset(
        int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x.lstrip("-").isdigit()
    )
    if not admins:
        raise RuntimeError("ADMIN_IDS .env faylida ko'rsatilmagan (o'z Telegram ID raqamingiz)")
    return ShopConfig(
        bot_token=token,
        admin_ids=admins,
        card=os.getenv("PAYMENT_CARD", "8600 0000 0000 0000"),
        card_holder=os.getenv("PAYMENT_HOLDER", "Ism Familiya"),
        support=os.getenv("SUPPORT_CONTACT", "@admin"),
        db_path=os.getenv("ROBUX_DB_PATH", "data/robux.db"),
        shop_name=os.getenv("SHOP_NAME", "Robux do'kon"),
        ai_model=os.getenv("CLAUDE_MODEL", "claude-opus-5-5") if os.getenv("ANTHROPIC_API_KEY") else None,
        ai_daily_limit=int(os.getenv("AI_DAILY_LIMIT", "30")),
        open_at=_hhmm(os.getenv("SHOP_OPEN", "15:00")),
        close_at=_hhmm(os.getenv("SHOP_CLOSE", "23:59")),
    )
