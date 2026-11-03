"""
Userbot: sizning Telegram akkauntingizdan qo'ng'iroq qilib, matnni o'zbekcha ovozda o'qib beradi
va suhbatdoshning javobini yozib olib, sizga ovozli xabar + matn ko'rinishida yetkazadi.

Ishlatish: «Saqlangan xabarlar» (Saved Messages) ga yozing:
    ada yangi agent bot yaratdim
"""
import asyncio
import logging
import os
import tempfile

from pytgcalls import PyTgCalls, filters
from pytgcalls.types import AudioQuality, CallConfig, ChatUpdate, MediaStream, RecordStream
from telethon import TelegramClient, events

from .config import load_caller_config
from .stt import to_voice_note, transcribe
from .tts import audio_duration, synthesize

log = logging.getLogger("caller")


def build_speech(alias: str, text: str, repeat: int, owner: str, listen: bool) -> str:
    text = text.strip()
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?":
        text += "."
    parts = [f"Assalomu alaykum, {alias}! {text}"]
    parts += [f"Yana bir bor takrorlayman. {text}"] * (repeat - 1)
    if listen:
        parts.append(f"Javobingiz bo'lsa, hozir ayting, men uni {owner}ga yetkazaman.")
    else:
        parts.append("Xayr, salomat bo'ling!")
    return " ".join(parts)


def media(path: str) -> MediaStream:
    try:
        return MediaStream(path, video_flags=MediaStream.Flags.IGNORE)
    except AttributeError:  # older py-tgcalls
        return MediaStream(path)


async def wait_or_hangup(ended: asyncio.Event, seconds: float) -> bool:
    """Kutadi; agar suhbatdosh go'shakni qo'ysa — True qaytaradi."""
    try:
        await asyncio.wait_for(ended.wait(), seconds)
        return True
    except asyncio.TimeoutError:
        return False


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load_caller_config()
    folder = os.path.dirname(cfg.session)
    if folder:
        os.makedirs(folder, exist_ok=True)

    client = TelegramClient(cfg.session, cfg.api_id, cfg.api_hash)
    calls = PyTgCalls(client)
    lock = asyncio.Lock()  # bir vaqtda bitta qo'ng'iroq
    ended_events: dict[int, asyncio.Event] = {}

    await client.start()  # birinchi marta: telefon raqam va kod so'raladi
    me = await client.get_me()
    await calls.start()
    log.info("Userbot ishga tushdi: %s. Kontaktlar: %s", me.first_name, ", ".join(cfg.contacts))

    @calls.on_update(filters.chat_update(ChatUpdate.Status.LEFT_CALL))
    async def on_call_left(_, update: ChatUpdate):
        if update.chat_id in ended_events:
            ended_events[update.chat_id].set()

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

            listen = cfg.listen_seconds > 0
            ended = asyncio.Event()
            ended_events[user.id] = ended
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    await _call(tmp, alias, text, user.id, listen, ended, status)
            finally:
                ended_events.pop(user.id, None)

    async def _call(tmp, alias, text, user_id, listen, ended, status):
        speech = os.path.join(tmp, "speech.mp3")
        answer = os.path.join(tmp, "answer.mp3")
        try:
            await synthesize(build_speech(alias, text, cfg.repeat, me.first_name, listen), speech, cfg.voice)
        except Exception as e:
            await status.edit(f"⚠️ Ovoz yaratib bo'lmadi: {e}")
            return
        duration = await audio_duration(speech)

        await status.edit(f"📞 {alias} ga qo'ng'iroq qilinmoqda...")
        try:
            # shaxsiy chat ID -> P2P qo'ng'iroq; javob berilguncha kutadi
            await asyncio.wait_for(
                calls.play(user_id, media(speech), CallConfig(timeout=cfg.ring_timeout)),
                cfg.ring_timeout + 15,
            )
        except asyncio.TimeoutError:
            await _hangup(calls, user_id)
            await status.edit(f"📵 {alias} javob bermadi.")
            return
        except Exception as e:
            await _hangup(calls, user_id)
            await status.edit(f"📵 Qo'ng'iroq amalga oshmadi: {type(e).__name__} {e}")
            return

        # suhbatdosh ovozini boshidanoq yozib olamiz (u gapni bo'lsa ham saqlanadi)
        recording = False
        if listen:
            try:
                await calls.record(user_id, RecordStream(audio=answer, audio_parameters=AudioQuality.HIGH))
                recording = True
            except Exception as e:
                log.warning("Yozib olish ishga tushmadi: %s", e)

        await status.edit(f"🔊 {alias} bilan gaplashilmoqda (~{int(duration)} s)...")
        hung_up = await wait_or_hangup(ended, duration + 1.5)
        if listen and not hung_up:
            await status.edit(f"🎙 {alias}ning javobi tinglanmoqda ({cfg.listen_seconds} s)...")
            await wait_or_hangup(ended, cfg.listen_seconds)
        await _hangup(calls, user_id)
        await asyncio.sleep(1.5)  # ffmpeg faylni yozib tugatsin

        done = f"✅ {alias} ga matn o'qib berildi:\n«{text}»"
        if not recording or not os.path.exists(answer) or os.path.getsize(answer) < 2000:
            await status.edit(done + ("\n\n🎙 Javob yozib olinmadi." if listen else ""))
            return

        await status.edit(done + "\n\n🎙 Javob matnga aylantirilmoqda...")
        voice = os.path.join(tmp, "answer.ogg")
        if await to_voice_note(answer, voice):
            await client.send_file("me", voice, voice_note=True, caption=f"🎙 {alias}ning javobi", reply_to=status.id)
        try:
            heard = await transcribe(answer)
        except Exception as e:
            log.warning("Matnga aylantirib bo'lmadi: %s", e)
            heard = ""
        if heard:
            await status.edit(done + f"\n\n🗣 {alias}ning javobi:\n«{heard}»")
        else:
            await status.edit(done + "\n\n🗣 Javob matnga aylantirilmadi — ovozli xabarni tinglang 👇")

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
