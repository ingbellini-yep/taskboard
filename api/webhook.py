"""
Vercel Serverless Function — webhook Telegram.
Riceve aggiornamenti Telegram via POST /api/webhook.
Handler in formato BaseHTTPRequestHandler (supportato nativamente da Vercel Python).
"""
from __future__ import annotations
import sys
import os
import json
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        body = b"Taskboard webhook OK"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        # Verifica secret header
        secret_header = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if WEBHOOK_SECRET and secret_header != WEBHOOK_SECRET:
            body = b"Forbidden"
            self.send_response(403)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Leggi body
        content_length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(content_length)

        try:
            update_data = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            body = b"Bad Request"
            self.send_response(400)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Processa update
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        body = b"OK"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Disabilita log HTTP di default (evita rumore nei log Vercel)
        pass
