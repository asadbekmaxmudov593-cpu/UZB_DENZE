import re

from aiogram import Bot, F, Router
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import keyboards as kb
from .. import texts
from ..config import Config
from ..db import Database
from ..notifier import broadcast_request, refresh_notifications

router = Router(name="user")
router.message.filter(F.chat.type == "private")

PHONE_RE = re.compile(r"^\+?998\d{9}$")


class Order(StatesGroup):
    name = State()
    phone = State()
    topic = State()
    call_time = State()
    confirm = State()


async def _is_agent(db: Database, config: Config, user_id: int) -> bool:
    return user_id in config.admin_ids or await db.is_agent(user_id)


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, db: Database, config: Config):
    await state.clear()
    await message.answer(
        texts.WELCOME.format(name=message.from_user.full_name),
        reply_markup=kb.main_menu(await _is_agent(db, config, message.from_user.id)),
    )


@router.message(F.text == kb.BTN_INFO)
async def info(message: Message):
    await message.answer(texts.INFO)


@router.message(StateFilter("*"), F.text == kb.BTN_CANCEL)
async def cancel(message: Message, state: FSMContext, db: Database, config: Config):
    await state.clear()
    await message.answer(
        texts.CANCELLED, reply_markup=kb.main_menu(await _is_agent(db, config, message.from_user.id))
    )


# ---------- order flow ----------
@router.message(F.text == kb.BTN_ORDER)
async def order_start(message: Message, state: FSMContext):
    await state.set_state(Order.name)
    await message.answer(texts.ASK_NAME, reply_markup=kb.cancel_kb())


@router.message(Order.name, F.text)
async def order_name(message: Message, state: FSMContext):
    name = message.text.strip()[:64]
    if len(name) < 2:
        await message.answer(texts.ASK_NAME)
        return
    await state.update_data(name=name)
    await state.set_state(Order.phone)
    await message.answer(texts.ASK_PHONE, reply_markup=kb.phone_kb())


@router.message(Order.phone, F.contact)
async def order_phone_contact(message: Message, state: FSMContext):
    if message.contact.user_id and message.contact.user_id != message.from_user.id:
        await message.answer("⚠️ Iltimos, o'zingizning raqamingizni yuboring.")
        return
    phone = message.contact.phone_number
    if not phone.startswith("+"):
        phone = "+" + phone
    await _save_phone(message, state, phone)


@router.message(Order.phone, F.text)
async def order_phone_text(message: Message, state: FSMContext):
    phone = re.sub(r"[\s\-()]", "", message.text)
    if not PHONE_RE.match(phone):
        await message.answer(texts.BAD_PHONE)
        return
    if not phone.startswith("+"):
        phone = "+" + phone
    await _save_phone(message, state, phone)


async def _save_phone(message: Message, state: FSMContext, phone: str):
    await state.update_data(phone=phone)
    await state.set_state(Order.topic)
    await message.answer(texts.ASK_TOPIC, reply_markup=kb.topics_kb())


@router.message(Order.topic, F.text)
async def order_topic(message: Message, state: FSMContext):
    await state.update_data(topic=message.text.strip()[:200])
    await state.set_state(Order.call_time)
    await message.answer(texts.ASK_TIME, reply_markup=kb.times_kb())


@router.message(Order.call_time, F.text)
async def order_time(message: Message, state: FSMContext):
    await state.update_data(call_time=message.text.strip()[:64])
    await state.set_state(Order.confirm)
    data = await state.get_data()
    await message.answer("👌", reply_markup=kb.cancel_kb())
    await message.answer(
        texts.summary(data["name"], data["phone"], data["topic"], data["call_time"]),
        reply_markup=kb.confirm_kb(),
    )


@router.callback_query(Order.confirm, F.data.startswith("confirm:"))
async def order_confirm(call: CallbackQuery, state: FSMContext, db: Database, config: Config, bot: Bot):
    data = await state.get_data()
    await state.clear()
    menu = kb.main_menu(await _is_agent(db, config, call.from_user.id))
    await call.message.edit_reply_markup(reply_markup=None)

    if call.data == "confirm:no":
        await call.message.answer(texts.CANCELLED, reply_markup=menu)
        await call.answer()
        return

    req = await db.create_request(
        call.from_user.id, data["name"], data["phone"], data["topic"], data["call_time"]
    )
    await call.message.answer(
        texts.SENT.format(id=req.id), reply_markup=menu
    )
    await call.message.answer(
        "Agar kerak bo'lmasa, so'rovni bekor qilishingiz mumkin:", reply_markup=kb.user_cancel_kb(req.id)
    )
    if await broadcast_request(bot, db, config, req) == 0:
        await call.message.answer(
            "⚠️ Hozircha onlayn agentlar yo'q, so'rovingiz navbatda saqlandi."
        )
    await call.answer("Yuborildi ✅")


@router.callback_query(F.data.startswith("confirm:"))
async def order_confirm_stale(call: CallbackQuery):
    await call.answer("Bu so'rov eskirgan.", show_alert=True)


# ---------- my requests ----------
@router.message(F.text == kb.BTN_MY)
async def my_requests(message: Message, db: Database):
    reqs = await db.user_requests(message.from_user.id)
    if not reqs:
        await message.answer(texts.NO_REQUESTS)
        return
    for req in reqs:
        markup = kb.user_cancel_kb(req.id) if req.status in ("new", "in_progress") else None
        await message.answer(texts.request_card(req, for_agent=False), reply_markup=markup)


@router.callback_query(F.data.startswith("ucancel:"))
async def user_cancel(call: CallbackQuery, db: Database, bot: Bot):
    request_id = int(call.data.split(":")[1])
    req_before = await db.get_request(request_id)
    if not await db.cancel_request(request_id, call.from_user.id):
        await call.answer("So'rovni bekor qilib bo'lmaydi.", show_alert=True)
        return
    req = await db.get_request(request_id)
    await call.message.edit_reply_markup(reply_markup=None)
    await call.message.answer(f"🚫 So'rov #{request_id} bekor qilindi.")
    await refresh_notifications(bot, db, req)
    if req_before and req_before.agent_id:
        try:
            await bot.send_message(req_before.agent_id, f"🚫 Mijoz so'rov #{request_id} ni bekor qildi.")
        except Exception:
            pass
    await call.answer()


@router.message(StateFilter(None))
async def fallback(message: Message, db: Database, config: Config):
    await message.answer(
        "Menyudan kerakli bo'limni tanlang 👇",
        reply_markup=kb.main_menu(await _is_agent(db, config, message.from_user.id)),
    )
