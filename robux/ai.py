"""Claude asosidagi AI maslahatchi: mijozlarning savollariga o'zbekcha javob beradi."""
import logging
import time
from collections import defaultdict

import anthropic

log = logging.getLogger(__name__)

SYSTEM_RULES = """Sen «{shop}» Telegram do'konining AI maslahatchisisan. Do'kon Roblox o'yini uchun Robux sotadi.
Har doim o'zbek tilida (lotin yozuvida), qisqa va samimiy javob ber — 1-5 gap. Emoji kam ishlat.

Do'kon qanday ishlaydi:
1. Mijoz «🛒 Robux sotib olish» tugmasini bosib paket tanlaydi.
2. Roblox nikini (username) yozadi. Xohlasa gamepass havolasini ham yuboradi.
3. Ko'rsatilgan kartaga to'lov qiladi va chek rasmini botga yuboradi.
4. Admin chekni tekshiradi, Robuxni o'tkazadi va bot mijozga xabar beradi.
Buyurtmalar faqat har kuni {hours} (Toshkent vaqti) qabul qilinadi; boshqa vaqtda mijozga shu vaqtda kelishni ayt.
Buyurtma holatini «📦 Buyurtmalarim» bo'limida ko'rish mumkin. Murakkab masalalarda yordam: {support}.

Gamepass orqali o'tkazishda gamepass narxi = Robux miqdori / 0.7 (Roblox 30% komissiya oladi),
masalan 400 R$ uchun gamepass narxi 572 R$ bo'lishi kerak.

Qat'iy qoidalar:
- Hech qachon Roblox paroli, 2FA kodi yoki akkaunt ma'lumotlarini so'rama. Kimdir so'rasa — bu firibgarlik ekanini ayt.
- «Bepul Robux» yoki generator va'da qilma — bunday narsa yo'q, bu firibgarlik.
- To'lov o'tdi yoki buyurtma bajarildi deb o'zing tasdiqlama: buni faqat admin qiladi.
- Narxlarni faqat quyidagi ro'yxatdan ayt, o'zingdan to'qima. Ro'yxatda yo'q paket bo'lsa, admin bilan bog'lanishni tavsiya qil.
- Do'kon va Roblox mavzusidan tashqari savollarga muloyimlik bilan qisqa javob berib, mavzuga qaytar.

Hozirgi narxlar:
{prices}"""


class ShopAssistant:
    def __init__(self, model: str, shop_name: str, support: str, daily_limit: int, hours: str):
        self.client = anthropic.AsyncAnthropic()  # ANTHROPIC_API_KEY .env dan o'qiladi
        self.model = model
        self.shop_name = shop_name
        self.support = support
        self.daily_limit = daily_limit
        self.hours = hours
        self.history: dict[int, list[dict]] = defaultdict(list)
        self.usage: dict[int, tuple[str, int]] = {}

    def reset(self, user_id: int) -> None:
        self.history.pop(user_id, None)

    def _within_limit(self, user_id: int) -> bool:
        today = time.strftime("%Y-%m-%d")
        day, count = self.usage.get(user_id, (today, 0))
        if day != today:
            count = 0
        if count >= self.daily_limit:
            return False
        self.usage[user_id] = (today, count + 1)
        return True

    async def answer(self, user_id: int, text: str, packages: list[tuple[int, int]]) -> str:
        if not self._within_limit(user_id):
            return f"Bugungi savollar limiti tugadi 🙏 Ertaga yana yozing yoki {self.support} ga murojaat qiling."

        prices = "\n".join(f"- {r} R$ — {p:,} so'm".replace(",", " ") for r, p in packages) or "- (hozircha paket yo'q)"
        system = SYSTEM_RULES.format(shop=self.shop_name, support=self.support, hours=self.hours, prices=prices)

        messages = self.history[user_id]
        if len(messages) > 20:  # uzun suhbatni qisqartiramiz (faqat matn saqlanadi)
            del messages[:-10]
        messages.append({"role": "user", "content": text[:2000]})

        try:
            response = await self.client.beta.messages.create(
                model=self.model,
                max_tokens=8000,
                system=system,
                messages=messages,
                output_config={"effort": "low"},  # suhbat uchun yetarli va arzonroq
                cache_control={"type": "ephemeral"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.AuthenticationError:
            messages.pop()
            log.error("ANTHROPIC_API_KEY noto'g'ri")
            return "⚠️ AI vaqtincha ishlamayapti. Admin bilan bog'laning."
        except anthropic.RateLimitError:
            messages.pop()
            return "⏳ Hozir so'rovlar ko'p, birozdan keyin yozing."
        except anthropic.APIStatusError as e:
            messages.pop()
            log.error("Claude API xatosi %s: %s", e.status_code, e.message)
            return "⚠️ AI javob bera olmadi, birozdan keyin qayta urinib ko'ring."
        except anthropic.APIConnectionError:
            messages.pop()
            return "⚠️ Internet bilan muammo, birozdan keyin qayta urinib ko'ring."

        if response.stop_reason == "refusal":
            messages.pop()
            return "Kechirasiz, bu savolga javob bera olmayman 🙏"

        reply = "\n".join(b.text for b in response.content if b.type == "text").strip()
        if not reply:
            messages.pop()
            return "Savolingizni boshqacharoq yozib ko'ring 🙂"
        messages.append({"role": "assistant", "content": reply})
        return reply
