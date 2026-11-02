from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)

BTN_ORDER = "📞 Qo'ng'iroq buyurtma qilish"
BTN_MY = "📋 Mening so'rovlarim"
BTN_INFO = "ℹ️ Ma'lumot"
BTN_AGENT_QUEUE = "🗂 Navbatdagi so'rovlar"
BTN_AGENT_ACTIVE = "📞 Mening faol so'rovlarim"
BTN_CANCEL = "❌ Bekor qilish"
BTN_SHARE_PHONE = "📱 Raqamni yuborish"

TOPICS = ["🛒 Buyurtma", "💬 Maslahat", "🛠 Texnik yordam", "😠 Shikoyat", "📝 Boshqa"]
TIMES = ["⚡ Hozir", "🕐 Bugun", "📅 Ertaga"]


def main_menu(is_agent: bool = False) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text=BTN_ORDER)], [KeyboardButton(text=BTN_MY), KeyboardButton(text=BTN_INFO)]]
    if is_agent:
        rows.append([KeyboardButton(text=BTN_AGENT_QUEUE), KeyboardButton(text=BTN_AGENT_ACTIVE)])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def cancel_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True)


def phone_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=BTN_SHARE_PHONE, request_contact=True)],
            [KeyboardButton(text=BTN_CANCEL)],
        ],
        resize_keyboard=True,
    )


def _grid(items: list[str], per_row: int = 2) -> list[list[KeyboardButton]]:
    rows = [[KeyboardButton(text=t) for t in items[i : i + per_row]] for i in range(0, len(items), per_row)]
    rows.append([KeyboardButton(text=BTN_CANCEL)])
    return rows


def topics_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=_grid(TOPICS), resize_keyboard=True)


def times_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=_grid(TIMES, 3), resize_keyboard=True)


def confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Tasdiqlash", callback_data="confirm:yes"),
                InlineKeyboardButton(text="❌ Bekor qilish", callback_data="confirm:no"),
            ]
        ]
    )


def take_kb(request_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="✅ Qabul qilish", callback_data=f"take:{request_id}")]]
    )


def agent_work_kb(request_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Bajarildi", callback_data=f"done:{request_id}"),
                InlineKeyboardButton(text="📵 Javob bermadi", callback_data=f"noans:{request_id}"),
            ],
            [InlineKeyboardButton(text="↩️ Navbatga qaytarish", callback_data=f"release:{request_id}")],
        ]
    )


def user_cancel_kb(request_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🚫 So'rovni bekor qilish", callback_data=f"ucancel:{request_id}")]
        ]
    )
