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
