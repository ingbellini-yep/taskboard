"""
Vercel Serverless Function — webhook Telegram WSGI.
Riceve aggiornamenti Telegram via POST /api/webhook
"""
from __future__ import annotations
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update


def handler(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")

    if method == "GET":
        body = b"Taskboard webhook OK"
        start_response("200 OK", [
            ("Content-Type", "text/plain"),
            ("Content-Length", str(len(body)))
        ])
        return [body]

    if method == "POST":
        # Verifica secret header
        secret_header = environ.get("HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN", "")
        if WEBHOOK_SECRET and secret_header != WEBHOOK_SECRET:
            body = b"Forbidden"
            start_response("403 Forbidden", [
                ("Content-Type", "text/plain"),
                ("Content-Length", str(len(body)))
            ])
            return [body]

        # Leggi body
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0))
        except (ValueError, TypeError):
            content_length = 0

        raw = environ.get("wsgi.input", b"").read(content_length)

        try:
            update_data = json.loads(raw)
        except json.JSONDecodeError:
            body = b"Bad Request"
            start_response("400 Bad Request", [
                ("Content-Type", "text/plain"),
                ("Content-Length", str(len(body)))
            ])
            return [body]

        # Processa update
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        body = b"OK"
        start_response("200 OK", [
            ("Content-Type", "text/plain"),
            ("Content-Length", str(len(body)))
        ])
        return [body]

    # Metodo non supportato
    body = b"Method Not Allowed"
    start_response("405 Method Not Allowed", [
        ("Content-Type", "text/plain"),
        ("Content-Length", str(len(body)))
    ])
    return [body]