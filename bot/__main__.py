import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from .config import load_config
from .db import Database
from .handlers import setup_routers


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    config = load_config()
    db = Database(config.db_path)
    await db.init()

    bot = Bot(config.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=MemoryStorage())
    dp["db"] = db
    dp["config"] = config
    dp.include_router(setup_routers())

    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Bosh menyu"),
            BotCommand(command="queue", description="Navbatdagi so'rovlar (agentlar)"),
            BotCommand(command="active", description="Faol so'rovlarim (agentlar)"),
            BotCommand(command="admin", description="Admin buyruqlari"),
        ]
    )
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
