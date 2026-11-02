from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.types import Message

from ..config import Config
from ..db import STATUS_LABELS, Database

router = Router(name="admin")

HELP = (
    "🛠 <b>Admin buyruqlari</b>\n\n"
    "/addagent <code>ID [ism]</code> — agent qo'shish (yoki agent xabariga javoban /addagent)\n"
    "/removeagent <code>ID</code> — agentni o'chirish\n"
    "/agents — agentlar ro'yxati\n"
    "/stats — statistika\n"
    "/queue — navbatdagi so'rovlar\n"
    "/chatid — joriy chat ID si (guruhni sozlash uchun)"
)


class IsAdmin:
    async def __call__(self, message: Message, config: Config) -> bool:
        return message.from_user is not None and message.from_user.id in config.admin_ids


router.message.filter(IsAdmin())


@router.message(Command("admin"))
async def admin_help(message: Message):
    await message.answer(HELP)


@router.message(Command("chatid"))
async def chat_id(message: Message):
    await message.answer(f"Chat ID: <code>{message.chat.id}</code>")


@router.message(Command("addagent"))
async def add_agent(message: Message, command: CommandObject, db: Database):
    target = message.reply_to_message.from_user if message.reply_to_message else None
    if target:
        user_id, name = target.id, target.full_name
    else:
        parts = (command.args or "").split(maxsplit=1)
        if not parts or not parts[0].lstrip("-").isdigit():
            await message.answer("Foydalanish: /addagent <code>ID [ism]</code>")
            return
        user_id = int(parts[0])
        name = parts[1] if len(parts) > 1 else str(user_id)
    await db.add_agent(user_id, name)
    await message.answer(f"✅ Agent qo'shildi: <b>{name}</b> (<code>{user_id}</code>)")
    try:
        await message.bot.send_message(
            user_id, "🎧 Siz agent sifatida qo'shildingiz! Menyuni yangilash uchun /start bosing."
        )
    except Exception:
        await message.answer("ℹ️ Agent botga hali /start yozmagan — xabar yuborilmadi.")


@router.message(Command("removeagent"))
async def remove_agent(message: Message, command: CommandObject, db: Database):
    arg = (command.args or "").strip()
    if not arg.lstrip("-").isdigit():
        await message.answer("Foydalanish: /removeagent <code>ID</code>")
        return
    ok = await db.remove_agent(int(arg))
    await message.answer("🗑 Agent o'chirildi." if ok else "Bunday agent topilmadi.")


@router.message(Command("agents"))
async def agents(message: Message, db: Database):
    rows = await db.list_agents()
    if not rows:
        await message.answer("Agentlar yo'q. /addagent orqali qo'shing.")
        return
    text = "\n".join(f"{i}. {name} — <code>{uid}</code>" for i, (uid, name) in enumerate(rows, 1))
    await message.answer(f"🎧 <b>Agentlar ({len(rows)}):</b>\n\n{text}")


@router.message(Command("stats"))
async def stats(message: Message, db: Database):
    data = await db.stats()
    total = sum(data.values())
    lines = [f"📊 <b>Statistika</b>\n\nJami so'rovlar: <b>{total}</b>"]
    lines += [f"{STATUS_LABELS[k]}: <b>{v}</b>" for k, v in data.items()]
    top = await db.agent_stats()
    if top:
        lines.append("\n🏆 <b>Agentlar reytingi</b> (bajarildi / javobsiz):")
        lines += [f"{i}. {name} — {d} / {n}" for i, (name, d, n) in enumerate(top, 1)]
    await message.answer("\n".join(lines))
