import os
from dataclasses import dataclass

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS agents (
    user_id    INTEGER PRIMARY KEY,
    full_name  TEXT NOT NULL,
    added_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    full_name     TEXT NOT NULL,
    phone         TEXT NOT NULL,
    topic         TEXT NOT NULL,
    call_time     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'new',
    agent_id      INTEGER,
    agent_name    TEXT,
    note          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    request_id INTEGER NOT NULL,
    chat_id    INTEGER NOT NULL,
    message_id INTEGER NOT NULL
);
"""

STATUS_LABELS = {
    "new": "🆕 Yangi",
    "in_progress": "📞 Jarayonda",
    "done": "✅ Bajarildi",
    "no_answer": "📵 Javob bermadi",
    "cancelled": "🚫 Bekor qilindi",
}


@dataclass
class Request:
    id: int
    user_id: int
    full_name: str
    phone: str
    topic: str
    call_time: str
    status: str
    agent_id: int | None
    agent_name: str | None
    note: str | None
    created_at: str
    updated_at: str

    @property
    def status_label(self) -> str:
        return STATUS_LABELS.get(self.status, self.status)


class Database:
    def __init__(self, path: str):
        self.path = path

    async def init(self) -> None:
        folder = os.path.dirname(self.path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        async with aiosqlite.connect(self.path) as db:
            await db.executescript(SCHEMA)
            await db.commit()

    # ---------- agents ----------
    async def add_agent(self, user_id: int, full_name: str) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO agents (user_id, full_name) VALUES (?, ?)",
                (user_id, full_name),
            )
            await db.commit()

    async def remove_agent(self, user_id: int) -> bool:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute("DELETE FROM agents WHERE user_id = ?", (user_id,))
            await db.commit()
            return cur.rowcount > 0

    async def list_agents(self) -> list[tuple[int, str]]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute("SELECT user_id, full_name FROM agents ORDER BY added_at")
            return [(r[0], r[1]) for r in await cur.fetchall()]

    async def is_agent(self, user_id: int) -> bool:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute("SELECT 1 FROM agents WHERE user_id = ?", (user_id,))
            return await cur.fetchone() is not None

    # ---------- requests ----------
    async def create_request(
        self, user_id: int, full_name: str, phone: str, topic: str, call_time: str
    ) -> Request:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "INSERT INTO requests (user_id, full_name, phone, topic, call_time) "
                "VALUES (?, ?, ?, ?, ?)",
                (user_id, full_name, phone, topic, call_time),
            )
            await db.commit()
            request_id = cur.lastrowid
        req = await self.get_request(request_id)
        assert req is not None
        return req

    async def get_request(self, request_id: int) -> Request | None:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
            row = await cur.fetchone()
            return Request(*row) if row else None

    async def user_requests(self, user_id: int, limit: int = 10) -> list[Request]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT * FROM requests WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                (user_id, limit),
            )
            return [Request(*r) for r in await cur.fetchall()]

    async def requests_by_status(self, status: str, limit: int = 20) -> list[Request]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT * FROM requests WHERE status = ? ORDER BY id LIMIT ?",
                (status, limit),
            )
            return [Request(*r) for r in await cur.fetchall()]

    async def agent_active(self, agent_id: int) -> list[Request]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT * FROM requests WHERE agent_id = ? AND status = 'in_progress' ORDER BY id",
                (agent_id,),
            )
            return [Request(*r) for r in await cur.fetchall()]

    async def take_request(self, request_id: int, agent_id: int, agent_name: str) -> bool:
        """Atomically assign a *new* request to an agent. Returns False if already taken."""
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "UPDATE requests SET status = 'in_progress', agent_id = ?, agent_name = ?, "
                "updated_at = datetime('now') WHERE id = ? AND status = 'new'",
                (agent_id, agent_name, request_id),
            )
            await db.commit()
            return cur.rowcount > 0

    async def finish_request(
        self, request_id: int, agent_id: int, status: str, note: str | None = None
    ) -> bool:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "UPDATE requests SET status = ?, note = COALESCE(?, note), "
                "updated_at = datetime('now') "
                "WHERE id = ? AND agent_id = ? AND status = 'in_progress'",
                (status, note, request_id, agent_id),
            )
            await db.commit()
            return cur.rowcount > 0

    async def release_request(self, request_id: int, agent_id: int) -> bool:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "UPDATE requests SET status = 'new', agent_id = NULL, agent_name = NULL, "
                "updated_at = datetime('now') "
                "WHERE id = ? AND agent_id = ? AND status = 'in_progress'",
                (request_id, agent_id),
            )
            await db.commit()
            return cur.rowcount > 0

    async def cancel_request(self, request_id: int, user_id: int) -> bool:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "UPDATE requests SET status = 'cancelled', updated_at = datetime('now') "
                "WHERE id = ? AND user_id = ? AND status IN ('new', 'in_progress')",
                (request_id, user_id),
            )
            await db.commit()
            return cur.rowcount > 0

    async def stats(self) -> dict[str, int]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute("SELECT status, COUNT(*) FROM requests GROUP BY status")
            data = {k: 0 for k in STATUS_LABELS}
            for status, count in await cur.fetchall():
                data[status] = count
            return data

    async def agent_stats(self) -> list[tuple[str, int, int]]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT agent_name, "
                "SUM(status = 'done'), SUM(status = 'no_answer') "
                "FROM requests WHERE agent_id IS NOT NULL "
                "GROUP BY agent_id ORDER BY 2 DESC"
            )
            return [(r[0] or "?", r[1] or 0, r[2] or 0) for r in await cur.fetchall()]

    # ---------- notification messages (to update them later) ----------
    async def save_notification(self, request_id: int, chat_id: int, message_id: int) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT INTO notifications (request_id, chat_id, message_id) VALUES (?, ?, ?)",
                (request_id, chat_id, message_id),
            )
            await db.commit()

    async def get_notifications(self, request_id: int) -> list[tuple[int, int]]:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT chat_id, message_id FROM notifications WHERE request_id = ?",
                (request_id,),
            )
            return [(r[0], r[1]) for r in await cur.fetchall()]
