# 📞 Telegram Qo'ng'iroq Agent Bot

Mijozlar **qayta qo'ng'iroq** buyurtma qiladigan, agentlar (operatorlar) esa so'rovlarni qabul qilib, mijozga qo'ng'iroq qiladigan Telegram bot.
Python 3.10+, [aiogram 3](https://docs.aiogram.dev/), SQLite.

## Imkoniyatlar

**Mijoz uchun**
- 📞 Qo'ng'iroq buyurtma qilish: ism → telefon (kontakt tugmasi yoki `+998...`) → mavzu → qulay vaqt → tasdiqlash
- 📋 Mening so'rovlarim — holatini kuzatish va bekor qilish
- Agent qabul qilganda / yakunlaganda avtomatik xabar

**Agent uchun**
- Yangi so'rov agentlar guruhiga (yoki har bir agentga shaxsan) «✅ Qabul qilish» tugmasi bilan keladi
- Bir so'rovni faqat bitta agent oladi (atomar tekshiruv), boshqalarda tugma yo'qoladi
- «✅ Bajarildi», «📵 Javob bermadi», «↩️ Navbatga qaytarish»
- 🗂 Navbatdagi so'rovlar (`/queue`), 📞 Faol so'rovlarim (`/active`)

**Admin uchun**
- `/addagent ID [ism]` (yoki agent xabariga javoban `/addagent`), `/removeagent ID`, `/agents`
- `/stats` — holatlar bo'yicha statistika va agentlar reytingi
- `/chatid` — guruh ID sini bilish

## O'rnatish

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # BOT_TOKEN, ADMIN_IDS, (ixtiyoriy) AGENTS_CHAT_ID ni to'ldiring
python -m bot
```

### Sozlamalar (`.env`)

| O'zgaruvchi | Tavsif |
|---|---|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `ADMIN_IDS` | Adminlar ID lari, vergul bilan |
| `AGENTS_CHAT_ID` | (ixtiyoriy) Agentlar guruhi ID si. Bo'sh bo'lsa, so'rovlar har bir agentga (agent yo'q bo'lsa — adminlarga) shaxsan yuboriladi |
| `DB_PATH` | SQLite fayl yo'li (standart: `data/bot.db`) |

### Agentlar guruhini ulash
1. Botni guruhga qo'shing, guruhda `/chatid` yozing (admin sifatida).
2. Olingan ID ni `AGENTS_CHAT_ID` ga yozing va botni qayta ishga tushiring.
3. Har bir agent botga shaxsiy xabarda `/start` yozishi kerak — ish kartochkasi shaxsiy chatga keladi.

## Tuzilma

```
bot/
  __main__.py      # ishga tushirish
  config.py        # .env o'qish
  db.py            # SQLite (agentlar, so'rovlar, xabarlar)
  keyboards.py     # tugmalar
  texts.py         # matnlar
  notifier.py      # agentlarga yuborish / xabarlarni yangilash
  handlers/
    user.py        # mijoz oqimi
    agent.py       # agent amallari
    admin.py       # admin buyruqlari
```

---

# 🔊 Akkauntdan qo'ng'iroq qilib, matnni o'zbekcha o'qib beruvchi userbot

`caller/` — **sizning shaxsiy Telegram akkauntingizdan** (oddiy bot qo'ng'iroq qila olmaydi) kontaktga ovozli qo'ng'iroq qiladi va yozgan matningizni o'zbekcha ovozda o'qib beradi.

Bepul vositalar:
- [Telethon](https://github.com/LonamiWebs/Telethon) — akkauntga ulanish (API_ID/API_HASH bepul: https://my.telegram.org)
- [py-tgcalls](https://github.com/pytgcalls/pytgcalls) — Telegram ovozli qo'ng'iroq
- [edge-tts](https://github.com/rany2/edge-tts) — bepul o'zbekcha ovoz (`uz-UZ-SardorNeural` erkak, `uz-UZ-MadinaNeural` ayol)
- ffmpeg

## Ishlatish

«**Saqlangan xabarlar**» (Saved Messages) ga yozasiz:

```
ada yangi agent bot yaratdim
```

Natija: `CALL_CONTACTS` dagi **ada** ga qo'ng'iroq qilinadi, u javob berganda ovozda o'qiladi:
> «Assalomu alaykum, ada! Yangi agent bot yaratdim. Yana bir bor takrorlayman. Yangi agent bot yaratdim. Xayr, salomat bo'ling!»

Holat (qo'ng'iroq qilinmoqda / javob bermadi / o'qib berildi) shu yerning o'zida ko'rsatiladi.
Birinchi so'z — kontakt taxallusi, qolgani — o'qiladigan matn. Bir nechta kontakt qo'shsa bo'ladi:
`CALL_CONTACTS=ada:@ada_username,oyi:+998901234567`

## O'rnatish

```bash
sudo apt install ffmpeg          # Windows: ffmpeg.org dan yuklab PATH ga qo'shing
pip install -r requirements.txt -r requirements-caller.txt
cp .env.example .env             # API_ID, API_HASH, CALL_CONTACTS ni to'ldiring
python -m caller                 # birinchi marta telefon raqam va SMS kod so'raladi
```

⚠️ `data/my_account.session` faylini hech kimga bermang — bu akkauntingizga to'liq kirish kaliti.
Userbotlardan me'yorida foydalaning (spam qo'ng'iroqlar akkaunt bloklanishiga olib kelishi mumkin).
