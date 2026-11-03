import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from .ai import ShopAssistant
from .config import load_shop_config
from .db import ShopDB
from .handlers import router


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load_shop_config()
    db = ShopDB(cfg.db_path)
    await db.init()

    assistant = None
    if cfg.ai_model:
        assistant = ShopAssistant(cfg.ai_model, cfg.shop_name, cfg.support, cfg.ai_daily_limit, cfg.hours)
        logging.info("AI maslahatchi yoqildi: %s", cfg.ai_model)
    else:
        logging.warning("ANTHROPIC_API_KEY yo'q — AI maslahatchi o'chirilgan")

    bot = Bot(cfg.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=MemoryStorage())
    dp["db"], dp["config"], dp["assistant"] = db, cfg, assistant
    dp.include_router(router)
    await bot.set_my_commands([
        BotCommand(command="start", description="Bosh menyu"),
        BotCommand(command="new", description="AI bilan suhbatni yangilash"),
        BotCommand(command="admin", description="Admin buyruqlari"),
    ])
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Robux bot to'xtatildi.")
