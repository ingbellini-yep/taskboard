"""
Vercel Serverless Function — riceve aggiornamenti Telegram via webhook POST.
URL: https://<dominio>/api/webhook
"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
from http.server import BaseHTTPRequestHandler

# Aggiungo la root del progetto al path (necessario per import bot.*)
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update


class handler(BaseHTTPRequestHandler):

    def do_POST(self) -> None:
        # Verifica secret header (Telegram → webhook secret)
        secret_header = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if WEBHOOK_SECRET and secret_header != WEBHOOK_SECRET:
            self._respond(403, b"Forbidden")
            return

        # Leggo body
        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length)

        try:
            update_data = json.loads(raw)
        except json.JSONDecodeError:
            self._respond(400, b"Bad Request")
            return

        # Processo l'aggiornamento (sync wrapper su asyncio)
        try:
            process_update(update_data)
        except Exception as exc:
            # Non propagare l'errore a Telegram (altrimenti riprova all'infinito)
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        # Rispondo sempre 200 a Telegram
        self._respond(200, b"OK")

    def do_GET(self) -> None:
        self._respond(200, b"Taskboard webhook OK")

    def _respond(self, code: int, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: object) -> None:
        pass  # disabilito log HTTP standard, usiamo print su stderr
