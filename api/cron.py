"""
Vercel Serverless Function — digest mattutino.
Handler in formato BaseHTTPRequestHandler (supportato nativamente da Vercel Python).
"""
from __future__ import annotations
import sys
import os
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import CRON_SECRET, TELEGRAM_CHAT_ID
from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest
from bot import tgapi


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self._run_cron()

    def do_POST(self):
        self._run_cron()

    def _reply(self, status: int, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _run_cron(self):
        # Vercel Cron invia "Authorization: Bearer <CRON_SECRET>" quando la variabile
        # d'ambiente CRON_SECRET è configurata: in quel caso le altre chiamate sono respinte.
        if CRON_SECRET and self.headers.get("Authorization", "") != f"Bearer {CRON_SECRET}":
            self._reply(401, b"Unauthorized")
            return

        try:
            now    = datetime.now(timezone.utc)
            events = get_today_events()
            tasks  = get_today_tasks()
            alerts = get_upcoming_event_alerts()
            msg    = daily_digest(now, events, tasks, alerts)
            if not msg.strip():
                msg = "⚠️ Digest vuoto"

            print(f"[cron] msg_len={len(msg)}", file=sys.stderr)
            # tgapi non riporta mai l'URL negli errori (l'URL contiene il token del bot)
            tgapi.send_message(TELEGRAM_CHAT_ID, msg, parse_mode="HTML")
            self._reply(200, b"Digest inviato")

        except Exception as exc:
            # Il dettaglio resta nei log; al chiamante non viene restituito nulla di interno
            print(f"[cron] ERROR: {exc}", file=sys.stderr)
            self._reply(500, b"Errore nell'invio del digest")

    def log_message(self, format, *args):
        pass
