import math
from html import escape

from aiogram import Bot, F, Router
from aiogram.enums import ChatAction
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandObject, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)

from .ai import ShopAssistant
from .config import ShopConfig
from .db import STATUS, Order, ShopDB

router = Router()
router.message.filter(F.chat.type == "private")

BTN_BUY = "🛒 Robux sotib olish"
BTN_ORDERS = "📦 Buyurtmalarim"
BTN_PRICES = "💰 Narxlar"
BTN_HELP = "📞 Yordam"
BTN_CANCEL = "❌ Bekor qilish"
BTN_SKIP = "➡️ O'tkazib yuborish"

MENU = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text=BTN_BUY)],
              [KeyboardButton(text=BTN_ORDERS), KeyboardButton(text=BTN_PRICES)],
              [KeyboardButton(text=BTN_HELP)]],
    resize_keyboard=True,
)
CANCEL_KB = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True)
SKIP_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text=BTN_SKIP)], [KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True
)


class Buy(StatesGroup):
    nick = State()
    gamepass = State()
    receipt = State()


def som(x: int) -> str:
    return f"{x:,}".replace(",", " ") + " so'm"


def gamepass_price(robux: int) -> int:
    return math.ceil(robux / 0.7)


def order_card(o: Order, *, admin: bool = False) -> str:
    lines = [
        f"🧾 <b>Buyurtma #{o.id}</b> — {o.status_label}",
        f"💎 {o.robux} R$ — <b>{som(o.price)}</b>",
        f"🎮 Roblox nik: <code>{escape(o.roblox_nick)}</code>",
    ]
    if o.gamepass:
        lines.append(f"🎫 Gamepass: {escape(o.gamepass)}")
    if admin:
        who = f"@{o.username}" if o.username else f'<a href="tg://user?id={o.user_id}">{escape(o.full_name)}</a>'
        lines.append(f"👤 Mijoz: {who} (<code>{o.user_id}</code>)")
    lines.append(f"🗓 {o.created_at}")
    return "\n".join(lines)


def admin_kb(o: Order) -> InlineKeyboardMarkup | None:
    if o.status == "checking":
        rows = [[InlineKeyboardButton(text="✅ To'lov keldi", callback_data=f"adm:paid:{o.id}"),
                 InlineKeyboardButton(text="❌ Rad etish", callback_data=f"adm:reject:{o.id}")]]
    elif o.status == "paid":
        rows = [[InlineKeyboardButton(text="📦 Robux yetkazildi", callback_data=f"adm:deliver:{o.id}")]]
    else:
        return None
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def refresh_admin_msgs(bot: Bot, db: ShopDB, o: Order) -> None:
    for chat_id, msg_id in await db.admin_msgs(o.id):
        try:
            await bot.edit_message_caption(chat_id=chat_id, message_id=msg_id,
                                           caption=order_card(o, admin=True), reply_markup=admin_kb(o))
        except TelegramAPIError:
            pass


# ---------------- umumiy ----------------
@router.message(CommandStart())
async def start(m: Message, state: FSMContext, config: ShopConfig, assistant: ShopAssistant | None):
    await state.clear()
    ai_line = "\n\n🤖 Savolingiz bo'lsa, shunchaki yozing — AI maslahatchi javob beradi." if assistant else ""
    await m.answer(
        f"Assalomu alaykum, <b>{escape(m.from_user.full_name)}</b>! 👋\n"
        f"<b>{escape(config.shop_name)}</b> ga xush kelibsiz — bu yerda Roblox uchun Robux sotib olasiz.\n\n"
        "🔒 Biz hech qachon Roblox parolingizni so'ramaymiz!" + ai_line,
        reply_markup=MENU,
    )


@router.message(StateFilter("*"), F.text == BTN_CANCEL)
async def cancel(m: Message, state: FSMContext):
    await state.clear()
    await m.answer("❌ Bekor qilindi.", reply_markup=MENU)


@router.message(F.text == BTN_PRICES)
async def prices(m: Message, db: ShopDB):
    pk = await db.packages()
    text = "\n".join(f"💎 <b>{r} R$</b> — {som(p)}" for r, p in pk) or "Hozircha paketlar yo'q."
    await m.answer("💰 <b>Narxlar</b>\n\n" + text)


@router.message(F.text == BTN_HELP)
async def help_(m: Message, config: ShopConfig):
    await m.answer(
        "📞 <b>Yordam</b>\n\n"
        "1. «🛒 Robux sotib olish» — paketni tanlang\n"
        "2. Roblox nikingizni yozing\n"
        "3. Kartaga to'lang va chek rasmini yuboring\n"
        "4. Admin tasdiqlagach Robux o'tkaziladi\n\n"
        f"Savollar uchun: {escape(config.support)}\n"
        "/new — AI bilan suhbatni yangidan boshlash"
    )


@router.message(Command("new"))
async def new_chat(m: Message, assistant: ShopAssistant | None):
    if assistant:
        assistant.reset(m.from_user.id)
    await m.answer("🆕 Suhbat yangidan boshlandi.", reply_markup=MENU)


# ---------------- sotib olish ----------------
@router.message(F.text == BTN_BUY)
async def buy(m: Message, db: ShopDB, state: FSMContext):
    await state.clear()
    pk = await db.packages()
    if not pk:
        await m.answer("Hozircha paketlar yo'q 😔")
        return
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"💎 {r} R$ — {som(p)}", callback_data=f"pkg:{r}")] for r, p in pk
    ])
    await m.answer("Paketni tanlang 👇", reply_markup=kb)


@router.callback_query(F.data.startswith("pkg:"))
async def pick_package(c: CallbackQuery, db: ShopDB, state: FSMContext):
    robux = int(c.data.split(":")[1])
    price = await db.package_price(robux)
    if price is None:
        await c.answer("Bu paket endi mavjud emas.", show_alert=True)
        return
    await state.set_state(Buy.nick)
    await state.update_data(robux=robux, price=price)
    await c.message.answer(
        f"💎 <b>{robux} R$</b> — {som(price)}\n\n🎮 Roblox nikingizni (username) yozing:",
        reply_markup=CANCEL_KB,
    )
    await c.answer()


@router.message(Buy.nick, F.text)
async def got_nick(m: Message, state: FSMContext):
    nick = m.text.strip().lstrip("@")
    if not (3 <= len(nick) <= 20) or not nick.replace("_", "").isalnum():
        await m.answer("⚠️ Roblox nik 3–20 belgi, faqat lotin harf, raqam va _ bo'ladi. Qayta yozing:")
        return
    data = await state.get_data()
    await state.update_data(nick=nick)
    await state.set_state(Buy.gamepass)
    await m.answer(
        "🎫 Agar Robuxni <b>gamepass</b> orqali olmoqchi bo'lsangiz, gamepass havolasini yuboring.\n"
        f"Gamepass narxi <b>{gamepass_price(data['robux'])} R$</b> bo'lishi kerak (Roblox 30% oladi).\n\n"
        "Bilmasangiz — «➡️ O'tkazib yuborish» ni bosing, admin o'zi bog'lanadi.",
        reply_markup=SKIP_KB,
    )


@router.message(Buy.gamepass, F.text)
async def got_gamepass(m: Message, state: FSMContext, db: ShopDB, config: ShopConfig):
    gp = None if m.text == BTN_SKIP else m.text.strip()[:300]
    data = await state.get_data()
    o = await db.create_order(m.from_user.id, m.from_user.username, m.from_user.full_name,
                              data["robux"], data["price"], data["nick"], gp)
    await state.set_state(Buy.receipt)
    await state.update_data(order_id=o.id)
    await m.answer(
        f"🧾 Buyurtma <b>#{o.id}</b> yaratildi.\n\n"
        f"💳 Quyidagi kartaga <b>{som(o.price)}</b> o'tkazing:\n"
        f"<code>{escape(config.card)}</code>\n👤 {escape(config.card_holder)}\n\n"
        "📸 So'ng to'lov <b>chekining rasmini</b> shu yerga yuboring.",
        reply_markup=CANCEL_KB,
    )


@router.message(Buy.receipt, F.photo | F.document)
async def got_receipt(m: Message, state: FSMContext, db: ShopDB, config: ShopConfig, bot: Bot):
    order_id = (await state.get_data())["order_id"]
    file_id = m.photo[-1].file_id if m.photo else m.document.file_id
    if not await db.set_status(order_id, "checking", expect=("awaiting_payment",), receipt=file_id,
                               user_id=m.from_user.id):
        await state.clear()
        await m.answer("Bu buyurtma allaqachon ko'rib chiqilgan.", reply_markup=MENU)
        return
    await state.clear()
    o = await db.get(order_id)
    for admin_id in config.admin_ids:
        try:
            send = bot.send_photo if m.photo else bot.send_document
            msg = await send(admin_id, file_id, caption=order_card(o, admin=True), reply_markup=admin_kb(o))
            await db.save_admin_msg(o.id, admin_id, msg.message_id)
        except TelegramAPIError:
            pass
    await m.answer(f"✅ Chek qabul qilindi! Buyurtma <b>#{o.id}</b> tekshirilmoqda.\n"
                   "Tasdiqlangach sizga xabar beramiz ⏳", reply_markup=MENU)


@router.message(Buy.receipt)
async def need_receipt(m: Message):
    await m.answer("📸 Iltimos, to'lov chekining <b>rasmini</b> yuboring yoki «❌ Bekor qilish» ni bosing.")


# ---------------- mening buyurtmalarim ----------------
@router.message(F.text == BTN_ORDERS)
async def my_orders(m: Message, db: ShopDB):
    orders = await db.user_orders(m.from_user.id)
    if not orders:
        await m.answer("Sizda hali buyurtmalar yo'q.")
        return
    for o in orders:
        kb = None
        if o.status == "awaiting_payment":
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="📸 Chek yuborish", callback_data=f"pay:{o.id}"),
                InlineKeyboardButton(text="🚫 Bekor qilish", callback_data=f"ucancel:{o.id}"),
            ]])
        await m.answer(order_card(o), reply_markup=kb)


@router.callback_query(F.data.startswith("pay:"))
async def pay_again(c: CallbackQuery, state: FSMContext, db: ShopDB, config: ShopConfig):
    o = await db.get(int(c.data.split(":")[1]))
    if not o or o.user_id != c.from_user.id or o.status != "awaiting_payment":
        await c.answer("Bu buyurtmaga chek yuborib bo'lmaydi.", show_alert=True)
        return
    await state.set_state(Buy.receipt)
    await state.update_data(order_id=o.id)
    await c.message.answer(f"💳 <code>{escape(config.card)}</code> ({escape(config.card_holder)}) — "
                           f"{som(o.price)}\n📸 Chek rasmini yuboring:", reply_markup=CANCEL_KB)
    await c.answer()


@router.callback_query(F.data.startswith("ucancel:"))
async def user_cancel(c: CallbackQuery, db: ShopDB):
    oid = int(c.data.split(":")[1])
    ok = await db.set_status(oid, "cancelled", expect=("awaiting_payment",), user_id=c.from_user.id)
    await c.answer("🚫 Bekor qilindi" if ok else "Bekor qilib bo'lmaydi", show_alert=not ok)
    if ok:
        await c.message.edit_text(order_card(await db.get(oid)))


# ---------------- admin ----------------
@router.callback_query(F.data.startswith("adm:"))
async def admin_action(c: CallbackQuery, db: ShopDB, config: ShopConfig, bot: Bot):
    if c.from_user.id not in config.admin_ids:
        await c.answer("⛔ Faqat admin uchun", show_alert=True)
        return
    _, action, oid = c.data.split(":")
    oid = int(oid)
    flow = {
        "paid": ("paid", ("checking",), "✅ To'lovingiz tasdiqlandi! Buyurtma #{id}: {robux} R$ tez orada o'tkaziladi ⏳"),
        "reject": ("rejected", ("checking",), "❌ Buyurtma #{id} rad etildi. To'lov topilmadi yoki chek noto'g'ri. "
                                               "Savollar bo'lsa: " + config.support),
        "deliver": ("delivered", ("paid",), "🎉 Buyurtma #{id}: {robux} R$ Roblox akkauntingizga o'tkazildi! "
                                             "Xaridingiz uchun rahmat 💎"),
    }
    new, expect, user_text = flow[action]
    if not await db.set_status(oid, new, expect=expect):
        await c.answer("Bu buyurtma holati allaqachon o'zgargan.", show_alert=True)
        return
    o = await db.get(oid)
    await refresh_admin_msgs(bot, db, o)
    try:
        await bot.send_message(o.user_id, user_text.format(id=o.id, robux=o.robux))
    except TelegramAPIError:
        pass
    await c.answer(STATUS[new])


def _is_admin(m: Message, config: ShopConfig) -> bool:
    return m.from_user.id in config.admin_ids


@router.message(Command("admin"))
async def admin_help(m: Message, config: ShopConfig):
    if not _is_admin(m, config):
        return
    await m.answer(
        "🛠 <b>Admin buyruqlari</b>\n\n"
        "/orders — tekshirilishi kerak bo'lgan buyurtmalar\n"
        "/stats — statistika\n"
        "/setprice <code>ROBUX NARX</code> — paket qo'shish/o'zgartirish (masalan /setprice 400 55000)\n"
        "/delprice <code>ROBUX</code> — paketni o'chirish\n"
        "/myid — Telegram ID ingiz"
    )


@router.message(Command("myid"))
async def my_id(m: Message):
    await m.answer(f"Sizning ID: <code>{m.from_user.id}</code>")


@router.message(Command("orders"))
async def admin_orders(m: Message, db: ShopDB, config: ShopConfig):
    if not _is_admin(m, config):
        return
    orders = await db.by_status("checking", "paid")
    if not orders:
        await m.answer("🎉 Kutilayotgan buyurtmalar yo'q.")
        return
    for o in orders:
        await m.answer(order_card(o, admin=True), reply_markup=admin_kb(o))


@router.message(Command("stats"))
async def stats(m: Message, db: ShopDB, config: ShopConfig):
    if not _is_admin(m, config):
        return
    counts, robux, money = await db.stats()
    lines = [f"{STATUS[k]}: <b>{v}</b>" for k, v in counts.items()]
    await m.answer("📊 <b>Statistika</b>\n\n" + "\n".join(lines) +
                   f"\n\n💎 Sotilgan: <b>{robux} R$</b>\n💰 Tushum: <b>{som(money)}</b>")


@router.message(Command("setprice"))
async def set_price(m: Message, command: CommandObject, db: ShopDB, config: ShopConfig):
    if not _is_admin(m, config):
        return
    parts = (command.args or "").split()
    if len(parts) != 2 or not all(p.isdigit() for p in parts):
        await m.answer("Foydalanish: /setprice <code>400 55000</code>")
        return
    await db.set_package(int(parts[0]), int(parts[1]))
    await m.answer(f"✅ {parts[0]} R$ — {som(int(parts[1]))}")


@router.message(Command("delprice"))
async def del_price(m: Message, command: CommandObject, db: ShopDB, config: ShopConfig):
    if not _is_admin(m, config):
        return
    arg = (command.args or "").strip()
    ok = arg.isdigit() and await db.delete_package(int(arg))
    await m.answer("🗑 O'chirildi" if ok else "Bunday paket yo'q. Foydalanish: /delprice <code>400</code>")


# ---------------- AI maslahatchi (qolgan barcha matnlar) ----------------
@router.message(StateFilter(None), F.text)
async def ai_chat(m: Message, db: ShopDB, bot: Bot, assistant: ShopAssistant | None):
    if not assistant:
        await m.answer("Menyudan kerakli bo'limni tanlang 👇", reply_markup=MENU)
        return
    await bot.send_chat_action(m.chat.id, ChatAction.TYPING)
    reply = await assistant.answer(m.from_user.id, m.text, await db.packages())
    for i in range(0, len(reply), 4000):
        await m.answer(escape(reply[i:i + 4000]), reply_markup=MENU)
