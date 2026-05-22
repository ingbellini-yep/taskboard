"""
Entry point unico per tutte le route API Python.
Vercel serve questo file per /api/* quando non trova altri handler.
"""
from __future__ import annotations
import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest
from bot.dispatcher import process_update
import requests as _req


class handler:

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/cron":
            self._handle_cron()
        else:
            self._respond(200, b"API OK")

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/webhook":
            self._handle_webhook()
        else:
            self._respond(404, b"Not Found")

    def _handle_cron(self):
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
            self._respond(200, b"Digest inviato")
        except Exception as exc:
            print(f"[cron] ERROR: {exc}", file=sys.stderr)
            self._respond(500, str(exc).encode())

    def _handle_webhook(self):
        import json as _json
        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length)
        try:
            update_data = _json.loads(raw)
        except Exception:
            self._respond(400, b"Bad Request")
            return
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)
        self._respond(200, b"OK")

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)