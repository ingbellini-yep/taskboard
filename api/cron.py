"""
Vercel Serverless Function — digest mattutino.
Schedule vercel.json: "20 5 * * *" UTC = 7:20 CEST / 6:20 CET
Pattern: class handler(BaseHTTPRequestHandler) — rilevato staticamente da Vercel.
"""
from __future__ import annotations

import asyncio
import sys
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import telegram
from bot.config import BOT_TOKEN, CRON_SECRET, TELEGRAM_CHAT_ID
from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest


async def _send_digest() -> None:
    async with telegram.Bot(token=BOT_TOKEN) as bot:
        now = datetime.now(timezone.utc)
        events = get_today_events()
        tasks  = get_today_tasks()
        alerts = get_upcoming_event_alerts()
        msg = daily_digest(now, events, tasks, alerts)
        await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=msg, parse_mode="Markdown")


class handler(BaseHTTPRequestHandler):

    def do_GET(self) -> None:
        # Verifica Vercel cron secret
        auth = self.headers.get("Authorization", "")
        if CRON_SECRET and auth != f"Bearer {CRON_SECRET}":
            self._send(401, b"Unauthorized")
            return

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_send_digest())
            finally:
                loop.close()
                asyncio.set_event_loop(None)
            self._send(200, b"Digest inviato")
        except Exception as exc:
            print(f"[cron] ERROR: {exc}", file=sys.stderr)
            self._send(500, str(exc).encode())

    def _send(self, code: int, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: object) -> None:
        pass
