from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from .. import keyboards as kb
from ..config import Config
from ..db import Database
from ..notifier import broadcast_request, refresh_notifications
from ..texts import request_card

router = Router(name="agent")


async def is_staff(user_id: int, db: Database, config: Config) -> bool:
    return user_id in config.admin_ids or await db.is_agent(user_id)


# ---------- lists ----------
@router.message(F.chat.type == "private", F.text == kb.BTN_AGENT_QUEUE)
@router.message(F.chat.type == "private", Command("queue"))
async def queue(message: Message, db: Database, config: Config):
    if not await is_staff(message.from_user.id, db, config):
        return
    reqs = await db.requests_by_status("new")
    if not reqs:
        await message.answer("🎉 Navbat bo'sh — yangi so'rovlar yo'q.")
        return
    await message.answer(f"🗂 Navbatda <b>{len(reqs)}</b> ta so'rov:")
    for req in reqs:
        await message.answer(request_card(req), reply_markup=kb.take_kb(req.id))


@router.message(F.chat.type == "private", F.text == kb.BTN_AGENT_ACTIVE)
@router.message(F.chat.type == "private", Command("active"))
async def active(message: Message, db: Database, config: Config):
    if not await is_staff(message.from_user.id, db, config):
        return
    reqs = await db.agent_active(message.from_user.id)
    if not reqs:
        await message.answer("Sizda faol so'rovlar yo'q.")
        return
    for req in reqs:
        await message.answer(request_card(req), reply_markup=kb.agent_work_kb(req.id))


# ---------- take ----------
@router.callback_query(F.data.startswith("take:"))
async def take(call: CallbackQuery, db: Database, config: Config, bot: Bot):
    if not await is_staff(call.from_user.id, db, config):
        await call.answer("⛔ Siz agent emassiz.", show_alert=True)
        return
    request_id = int(call.data.split(":")[1])
    agent_name = call.from_user.full_name
    if not await db.take_request(request_id, call.from_user.id, agent_name):
        req = await db.get_request(request_id)
        await call.answer(
            f"Bu so'rov allaqachon: {req.status_label if req else 'topilmadi'}", show_alert=True
        )
        if req:
            await refresh_notifications(bot, db, req)
        return

    req = await db.get_request(request_id)
    await refresh_notifications(bot, db, req)

    # work card to agent privately
    try:
        await bot.send_message(
            call.from_user.id,
            "🎧 Siz so'rovni qabul qildingiz. Mijozga qo'ng'iroq qiling:\n\n" + request_card(req),
            reply_markup=kb.agent_work_kb(req.id),
        )
    except TelegramAPIError:
        # agent never started the bot in private — roll back
        await db.release_request(request_id, call.from_user.id)
        await refresh_notifications(bot, db, await db.get_request(request_id))
        await call.answer("Avval botga shaxsiy xabarda /start yozing!", show_alert=True)
        return

    # if pressed in private chat (e.g. from /queue list) — drop the button there too
    if call.message and call.message.chat.type == "private":
        try:
            await call.message.edit_reply_markup(reply_markup=None)
        except TelegramAPIError:
            pass

    try:
        await bot.send_message(
            req.user_id,
            f"🎧 So'rovingiz <b>#{req.id}</b> agent <b>{agent_name}</b> tomonidan qabul qilindi.\n"
            "Tez orada sizga qo'ng'iroq qilinadi! 📞",
        )
    except TelegramAPIError:
        pass
    await call.answer("Qabul qilindi ✅")


# ---------- finish / release ----------
async def _finish(call: CallbackQuery, db: Database, bot: Bot, status: str, user_text: str):
    request_id = int(call.data.split(":")[1])
    if not await db.finish_request(request_id, call.from_user.id, status):
        await call.answer("Bu amalni bajarib bo'lmaydi.", show_alert=True)
        return
    req = await db.get_request(request_id)
    await call.message.edit_text(request_card(req), reply_markup=None)
    await refresh_notifications(bot, db, req)
    try:
        await bot.send_message(req.user_id, user_text.format(id=req.id))
    except TelegramAPIError:
        pass
    await call.answer(req.status_label)


@router.callback_query(F.data.startswith("done:"))
async def done(call: CallbackQuery, db: Database, bot: Bot):
    await _finish(
        call, db, bot, "done",
        "✅ So'rovingiz <b>#{id}</b> yakunlandi. Murojaatingiz uchun rahmat! 🙏",
    )


@router.callback_query(F.data.startswith("noans:"))
async def no_answer(call: CallbackQuery, db: Database, bot: Bot):
    await _finish(
        call, db, bot, "no_answer",
        "📵 Agentimiz so'rov <b>#{id}</b> bo'yicha sizga qo'ng'iroq qildi, ammo javob bo'lmadi.\n"
        "Kerak bo'lsa, yangi so'rov qoldiring.",
    )


@router.callback_query(F.data.startswith("release:"))
async def release(call: CallbackQuery, db: Database, config: Config, bot: Bot):
    request_id = int(call.data.split(":")[1])
    if not await db.release_request(request_id, call.from_user.id):
        await call.answer("Bu amalni bajarib bo'lmaydi.", show_alert=True)
        return
    req = await db.get_request(request_id)
    await call.message.edit_text("↩️ So'rov navbatga qaytarildi.\n\n" + request_card(req), reply_markup=None)
    await refresh_notifications(bot, db, req)
    if not await db.get_notifications(request_id):
        await broadcast_request(bot, db, config, req)
    await call.answer("Navbatga qaytarildi")
