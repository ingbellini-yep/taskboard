"""
Vercel Serverless Function — webhook Telegram.
Usa class handler(BaseHTTPRequestHandler): unico pattern ufficiale Vercel Python
senza framework. La classe viene rilevata staticamente dal runtime.
"""
from __future__ import annotations

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import lazy: bot.config non solleva KeyError anche senza env vars
from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update


class handler(BaseHTTPRequestHandler):

    def do_GET(self) -> None:
        self._send(200, b"Taskboard webhook OK")

    def do_POST(self) -> None:
        # Verifica secret Telegram (header custom)
        secret = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if WEBHOOK_SECRET and secret != WEBHOOK_SECRET:
            self._send(403, b"Forbidden")
            return

        # Leggo body
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length > 0 else b""
            update_data = json.loads(raw)
        except Exception as exc:
            self._send(400, f"Bad Request: {exc}".encode())
            return

        # Processo update — non propagare eccezioni (Telegram riprova indefinitamente)
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        self._send(200, b"OK")

    def _send(self, code: int, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: object) -> None:
        pass  # silenzio i log HTTP standard
