"""Vercel Serverless Function — digest mattutino WSGI."""
from __future__ import annotations
import sys, os, json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest
import requests as _req


def handler(environ, start_response):
    try:
        now    = datetime.now(timezone.utc)
        events = get_today_events()
        tasks  = get_today_tasks()
        alerts = get_upcoming_event_alerts()
        msg    = daily_digest(now, events, tasks, alerts)
        if not msg.strip():
            msg = "⚠️ Digest vuoto"

        chat_id = int(os.environ.get("TELEGRAM_CHAT_ID", "0"))
        token   = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        print(f"[cron] chat_id={chat_id} msg_len={len(msg)}", file=sys.stderr)

        _req.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"},
            timeout=10
        ).raise_for_status()

        body = b"Digest inviato"
        start_response("200 OK", [("Content-Type", "text/plain"), ("Content-Length", str(len(body)))])
        return [body]

    except Exception as exc:
        print(f"[cron] ERROR: {exc}", file=sys.stderr)
        body = str(exc).encode()
        start_response("500 Internal Server Error", [("Content-Type", "text/plain"), ("Content-Length", str(len(body)))])
        return [body]