from html import escape

from .db import Request

WELCOME = (
    "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
    "Men qo'ng'iroq agenti botiman. Bu yerda siz operatorimizdan "
    "<b>qayta qo'ng'iroq</b> buyurtma qilishingiz mumkin.\n\n"
    "Quyidagi menyudan kerakli bo'limni tanlang 👇"
)

INFO = (
    "ℹ️ <b>Bot haqida</b>\n\n"
    "1. «📞 Qo'ng'iroq buyurtma qilish» tugmasini bosing.\n"
    "2. Ismingiz, telefon raqamingiz, murojaat mavzusi va qulay vaqtni kiriting.\n"
    "3. Bo'sh agent so'rovingizni qabul qiladi va sizga qo'ng'iroq qiladi.\n\n"
    "So'rovingiz holatini «📋 Mening so'rovlarim» bo'limida kuzatishingiz mumkin."
)

ASK_NAME = "✍️ Ismingizni kiriting:"
ASK_PHONE = (
    "📱 Telefon raqamingizni yuboring.\n"
    "Pastdagi tugmani bosing yoki <code>+998901234567</code> ko'rinishida yozing:"
)
BAD_PHONE = "⚠️ Raqam noto'g'ri. Iltimos, <code>+998901234567</code> ko'rinishida kiriting."
ASK_TOPIC = "📂 Murojaat mavzusini tanlang yoki o'zingiz yozing:"
ASK_TIME = "🕐 Sizga qachon qo'ng'iroq qilish qulay? Tanlang yoki yozing (masalan: <i>bugun 15:00</i>):"
CANCELLED = "❌ Bekor qilindi."
SENT = (
    "✅ So'rovingiz qabul qilindi! Raqami: <b>#{id}</b>\n\n"
    "Agentlarimiz tez orada siz bilan bog'lanadi. 📞"
)
NO_REQUESTS = "Sizda hali so'rovlar yo'q."


def summary(name: str, phone: str, topic: str, call_time: str) -> str:
    return (
        "📋 <b>Ma'lumotlarni tekshiring:</b>\n\n"
        f"👤 Ism: <b>{escape(name)}</b>\n"
        f"📱 Telefon: <b>{escape(phone)}</b>\n"
        f"📂 Mavzu: <b>{escape(topic)}</b>\n"
        f"🕐 Vaqt: <b>{escape(call_time)}</b>\n\n"
        "Hammasi to'g'rimi?"
    )


def request_card(req: Request, *, for_agent: bool = True) -> str:
    lines = [
        f"📞 <b>So'rov #{req.id}</b> — {req.status_label}",
        "",
        f"👤 Mijoz: <b>{escape(req.full_name)}</b>",
        f"📱 Telefon: <code>{escape(req.phone)}</code>",
        f"📂 Mavzu: {escape(req.topic)}",
        f"🕐 Qulay vaqt: {escape(req.call_time)}",
        f"🗓 Yaratilgan: {req.created_at}",
    ]
    if for_agent:
        lines.insert(3, f"🆔 Telegram: <a href=\"tg://user?id={req.user_id}\">{req.user_id}</a>")
    if req.agent_name:
        lines.append(f"🎧 Agent: <b>{escape(req.agent_name)}</b>")
    if req.note:
        lines.append(f"📝 Izoh: {escape(req.note)}")
    return "\n".join(lines)
