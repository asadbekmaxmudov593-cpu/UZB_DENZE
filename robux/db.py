import os
from dataclasses import dataclass

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS packages (
    robux INTEGER PRIMARY KEY,
    price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    username    TEXT,
    full_name   TEXT NOT NULL,
    robux       INTEGER NOT NULL,
    price       INTEGER NOT NULL,
    roblox_nick TEXT NOT NULL,
    gamepass    TEXT,
    status      TEXT NOT NULL DEFAULT 'awaiting_payment',
    receipt     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS admin_msgs (
    order_id   INTEGER NOT NULL,
    chat_id    INTEGER NOT NULL,
    message_id INTEGER NOT NULL
);
"""

DEFAULT_PACKAGES = [(80, 12_000), (400, 55_000), (800, 105_000), (1700, 215_000), (4500, 550_000)]

STATUS = {
    "awaiting_payment": "💳 To'lov kutilmoqda",
    "checking": "🔎 Chek tekshirilmoqda",
    "paid": "⏳ To'landi, Robux o'tkazilmoqda",
    "delivered": "✅ Yetkazildi",
    "rejected": "❌ Rad etildi",
    "cancelled": "🚫 Bekor qilindi",
}


@dataclass
class Order:
    id: int
    user_id: int
    username: str | None
    full_name: str
    robux: int
    price: int
    roblox_nick: str
    gamepass: str | None
    status: str
    receipt: str | None
    created_at: str
    updated_at: str

    @property
    def status_label(self) -> str:
        return STATUS.get(self.status, self.status)


class ShopDB:
    def __init__(self, path: str):
        self.path = path

    def _conn(self):
        return aiosqlite.connect(self.path)

    async def init(self) -> None:
        if os.path.dirname(self.path):
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
        async with self._conn() as db:
            await db.executescript(SCHEMA)
            cur = await db.execute("SELECT COUNT(*) FROM packages")
            if (await cur.fetchone())[0] == 0:
                await db.executemany("INSERT INTO packages VALUES (?, ?)", DEFAULT_PACKAGES)
            await db.commit()

    # ---- packages ----
    async def packages(self) -> list[tuple[int, int]]:
        async with self._conn() as db:
            cur = await db.execute("SELECT robux, price FROM packages ORDER BY robux")
            return [(r[0], r[1]) for r in await cur.fetchall()]

    async def package_price(self, robux: int) -> int | None:
        async with self._conn() as db:
            cur = await db.execute("SELECT price FROM packages WHERE robux = ?", (robux,))
            row = await cur.fetchone()
            return row[0] if row else None

    async def set_package(self, robux: int, price: int) -> None:
        async with self._conn() as db:
            await db.execute("INSERT OR REPLACE INTO packages VALUES (?, ?)", (robux, price))
            await db.commit()

    async def delete_package(self, robux: int) -> bool:
        async with self._conn() as db:
            cur = await db.execute("DELETE FROM packages WHERE robux = ?", (robux,))
            await db.commit()
            return cur.rowcount > 0

    # ---- orders ----
    async def create_order(self, user_id, username, full_name, robux, price, nick, gamepass) -> Order:
        async with self._conn() as db:
            cur = await db.execute(
                "INSERT INTO orders (user_id, username, full_name, robux, price, roblox_nick, gamepass) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, username, full_name, robux, price, nick, gamepass),
            )
            await db.commit()
            oid = cur.lastrowid
        return await self.get(oid)

    async def get(self, order_id: int) -> Order | None:
        async with self._conn() as db:
            cur = await db.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            row = await cur.fetchone()
            return Order(*row) if row else None

    async def user_orders(self, user_id: int, limit: int = 10) -> list[Order]:
        async with self._conn() as db:
            cur = await db.execute(
                "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)
            )
            return [Order(*r) for r in await cur.fetchall()]

    async def by_status(self, *statuses: str) -> list[Order]:
        q = ",".join("?" * len(statuses))
        async with self._conn() as db:
            cur = await db.execute(f"SELECT * FROM orders WHERE status IN ({q}) ORDER BY id", statuses)
            return [Order(*r) for r in await cur.fetchall()]

    async def set_status(self, order_id: int, new: str, *, expect: tuple[str, ...], receipt: str | None = None,
                         user_id: int | None = None) -> bool:
        """Atomik o'zgartirish: faqat joriy holat `expect` ichida bo'lsa."""
        q = ",".join("?" * len(expect))
        sql = (f"UPDATE orders SET status = ?, receipt = COALESCE(?, receipt), "
               f"updated_at = datetime('now', 'localtime') WHERE id = ? AND status IN ({q})")
        params: list = [new, receipt, order_id, *expect]
        if user_id is not None:
            sql += " AND user_id = ?"
            params.append(user_id)
        async with self._conn() as db:
            cur = await db.execute(sql, params)
            await db.commit()
            return cur.rowcount > 0

    async def stats(self) -> tuple[dict[str, int], int, int]:
        async with self._conn() as db:
            cur = await db.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
            counts = {k: 0 for k in STATUS}
            counts.update({s: c for s, c in await cur.fetchall()})
            cur = await db.execute(
                "SELECT COALESCE(SUM(robux), 0), COALESCE(SUM(price), 0) FROM orders WHERE status = 'delivered'"
            )
            robux, money = await cur.fetchone()
            return counts, robux, money

    # ---- admin notification messages ----
    async def save_admin_msg(self, order_id: int, chat_id: int, message_id: int) -> None:
        async with self._conn() as db:
            await db.execute("INSERT INTO admin_msgs VALUES (?, ?, ?)", (order_id, chat_id, message_id))
            await db.commit()

    async def admin_msgs(self, order_id: int) -> list[tuple[int, int]]:
        async with self._conn() as db:
            cur = await db.execute("SELECT chat_id, message_id FROM admin_msgs WHERE order_id = ?", (order_id,))
            return [(r[0], r[1]) for r in await cur.fetchall()]
