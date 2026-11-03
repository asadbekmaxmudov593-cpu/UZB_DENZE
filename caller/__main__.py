"""
Userbot: sizning Telegram akkauntingizdan qo'ng'iroq qilib, matnni o'zbekcha ovozda o'qib beradi.

Ishlatish: «Saqlangan xabarlar» (Saved Messages) ga yozing:
    ada yangi agent bot yaratdim
=> CALL_CONTACTS dagi «ada» kontaktiga qo'ng'iroq qilinadi va
   «Assalomu alaykum, ada! Yangi agent bot yaratdim» ovozda o'qiladi.
"""
import asyncio
import logging
import os
import tempfile

from pytgcalls import PyTgCalls
from pytgcalls.types import CallConfig, MediaStream
from telethon import TelegramClient, events

from .config import load_caller_config
from .tts import audio_duration, synthesize

log = logging.getLogger("caller")


def build_speech(alias: str, text: str, repeat: int) -> str:
    text = text.strip()
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?":
        text += "."
    parts = [f"Assalomu alaykum, {alias}! {text}"]
    parts += [f"Yana bir bor takrorlayman. {text}"] * (repeat - 1)
    parts.append("Xayr, salomat bo'ling!")
    return " ".join(parts)


def media(path: str) -> MediaStream:
    try:
        return MediaStream(path, video_flags=MediaStream.Flags.IGNORE)
    except AttributeError:  # older py-tgcalls
        return MediaStream(path)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load_caller_config()
    folder = os.path.dirname(cfg.session)
    if folder:
        os.makedirs(folder, exist_ok=True)

    client = TelegramClient(cfg.session, cfg.api_id, cfg.api_hash)
    calls = PyTgCalls(client)
    lock = asyncio.Lock()  # bir vaqtda bitta qo'ng'iroq

    await client.start()  # birinchi marta: telefon raqam va kod so'raladi
    me = await client.get_me()
    await calls.start()
    log.info("Userbot ishga tushdi: %s. Kontaktlar: %s", me.first_name, ", ".join(cfg.contacts))

    @client.on(events.NewMessage(outgoing=True, func=lambda e: e.chat_id == me.id))
    async def on_saved_message(event: events.NewMessage.Event):
        words = (event.raw_text or "").strip().split(maxsplit=1)
        if len(words) < 2 or words[0].lower() not in cfg.contacts:
            return
        alias, text = words[0].lower(), words[1]
        status = await event.reply(f"⏳ «{alias}» uchun ovoz tayyorlanmoqda...")

        async with lock:
            try:
                user = await client.get_entity(cfg.contacts[alias])
            except Exception as e:
                await status.edit(f"⚠️ Kontakt topilmadi ({cfg.contacts[alias]}): {e}")
                return

            with tempfile.TemporaryDirectory() as tmp:
                path = os.path.join(tmp, "speech.mp3")
                try:
                    await synthesize(build_speech(alias, text, cfg.repeat), path, cfg.voice)
                except Exception as e:
                    await status.edit(f"⚠️ Ovoz yaratib bo'lmadi: {e}")
                    return
                duration = await audio_duration(path)

                await status.edit(f"📞 {alias} ga qo'ng'iroq qilinmoqda...")
                try:
                    # shaxsiy chat ID -> P2P qo'ng'iroq; javob berilguncha kutadi
                    await asyncio.wait_for(
                        calls.play(user.id, media(path), CallConfig(timeout=cfg.ring_timeout)),
                        cfg.ring_timeout + 15,
                    )
                except asyncio.TimeoutError:
                    await _hangup(calls, user.id)
                    await status.edit(f"📵 {alias} javob bermadi.")
                    return
                except Exception as e:
                    await _hangup(calls, user.id)
                    await status.edit(f"📵 Qo'ng'iroq amalga oshmadi: {type(e).__name__} {e}")
                    return

                await status.edit(f"🔊 {alias} bilan gaplashilmoqda (~{int(duration)} s)...")
                await asyncio.sleep(duration + 2)
                await _hangup(calls, user.id)
                await status.edit(f"✅ {alias} ga matn o'qib berildi:\n«{text}»")

    await client.run_until_disconnected()


async def _hangup(calls: PyTgCalls, chat_id: int) -> None:
    try:
        await calls.leave_call(chat_id)
    except Exception:
        pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Userbot to'xtatildi.")
