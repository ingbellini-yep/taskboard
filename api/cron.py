"""
Vercel Serverless Function — digest mattutino (Cron 7:20 ora italiana).
Schedule vercel.json: "20 5 * * *" UTC = 7:20 CEST / 6:20 CET
Interfaccia: WSGI standard.
"""
from __future__ import annotations

import asyncio
import sys
import os
from datetime import datetime, timezone
from typing import Callable, Iterable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import telegram
from bot.config import BOT_TOKEN, CRON_SECRET, TELEGRAM_CHAT_ID
from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest


async def _send_digest() -> None:
    bot = telegram.Bot(token=BOT_TOKEN)
    now = datetime.now(timezone.utc)
    events = get_today_events()
    tasks  = get_today_tasks()
    alerts = get_upcoming_event_alerts()
    msg = daily_digest(now, events, tasks, alerts)
    async with bot:
        await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=msg, parse_mode="Markdown")


def handler(environ: dict, start_response: Callable) -> Iterable[bytes]:
    """WSGI entry point per Vercel Cron."""
    method = environ.get("REQUEST_METHOD", "GET")

    if method != "GET":
        return _respond(start_response, 405, b"Method Not Allowed")

    # Verifica Vercel cron secret
    auth = environ.get("HTTP_AUTHORIZATION", "")
    if CRON_SECRET and auth != f"Bearer {CRON_SECRET}":
        return _respond(start_response, 401, b"Unauthorized")

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_send_digest())
        finally:
            loop.close()
            asyncio.set_event_loop(None)
        return _respond(start_response, 200, b"Digest inviato")
    except Exception as exc:
        print(f"[cron] ERROR: {exc}", file=sys.stderr)
        return _respond(start_response, 500, str(exc).encode())


def _respond(start_response: Callable, status_code: int, body: bytes) -> list[bytes]:
    phrases = {200: "OK", 401: "Unauthorized", 405: "Method Not Allowed", 500: "Internal Server Error"}
    status = f"{status_code} {phrases.get(status_code, '')}"
    headers = [("Content-Type", "text/plain"), ("Content-Length", str(len(body)))]
    start_response(status, headers)
    return [body]
