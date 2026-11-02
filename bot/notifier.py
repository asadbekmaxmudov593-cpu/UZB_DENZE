"""Sending new requests to agents and keeping their notification messages in sync."""
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from .config import Config
from .db import Database, Request
from .keyboards import take_kb
from .texts import request_card

log = logging.getLogger(__name__)


async def broadcast_request(bot: Bot, db: Database, config: Config, req: Request) -> int:
    """Send a request card with a «take» button to the agents group or every agent/admin."""
    if config.agents_chat_id:
        targets = [config.agents_chat_id]
    else:
        targets = [uid for uid, _ in await db.list_agents()] or list(config.admin_ids)

    sent = 0
    for chat_id in targets:
        try:
            msg = await bot.send_message(chat_id, request_card(req), reply_markup=take_kb(req.id))
            await db.save_notification(req.id, chat_id, msg.message_id)
            sent += 1
        except TelegramAPIError as e:
            log.warning("Could not notify %s about request %s: %s", chat_id, req.id, e)
    return sent


async def refresh_notifications(bot: Bot, db: Database, req: Request) -> None:
    """Update every broadcast message for this request (remove the button once it's taken)."""
    markup = take_kb(req.id) if req.status == "new" else None
    for chat_id, message_id in await db.get_notifications(req.id):
        try:
            await bot.edit_message_text(
                request_card(req), chat_id=chat_id, message_id=message_id, reply_markup=markup
            )
        except TelegramAPIError:
            pass  # message deleted / not modified — ignore
