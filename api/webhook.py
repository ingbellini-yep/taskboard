"""
Vercel Serverless Function — webhook Telegram.
Interfaccia: WSGI standard (PEP 3333) — riconosciuta automaticamente da Vercel.
"""
from __future__ import annotations

import json
import sys
import os
from typing import Callable, Iterable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update


def handler(environ: dict, start_response: Callable) -> Iterable[bytes]:
    """WSGI entry point — Vercel lo rileva dalla firma (environ, start_response)."""
    method = environ.get("REQUEST_METHOD", "GET")

    if method == "GET":
        return _respond(start_response, 200, b"Taskboard webhook OK")

    if method == "POST":
        # Verifica secret Telegram
        secret_header = environ.get("HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN", "")
        if WEBHOOK_SECRET and secret_header != WEBHOOK_SECRET:
            return _respond(start_response, 403, b"Forbidden")

        # Leggo body
        try:
            length = int(environ.get("CONTENT_LENGTH") or 0)
            raw = environ["wsgi.input"].read(length) if length > 0 else b""
            update_data = json.loads(raw)
        except Exception as exc:
            return _respond(start_response, 400, f"Bad Request: {exc}".encode())

        # Processo l'update (non propagare eccezioni → Telegram riproverebbe)
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        return _respond(start_response, 200, b"OK")

    return _respond(start_response, 405, b"Method Not Allowed")


def _respond(start_response: Callable, status_code: int, body: bytes) -> list[bytes]:
    phrases = {200: "OK", 400: "Bad Request", 403: "Forbidden", 405: "Method Not Allowed"}
    status = f"{status_code} {phrases.get(status_code, '')}"
    headers = [
        ("Content-Type", "text/plain"),
        ("Content-Length", str(len(body))),
    ]
    start_response(status, headers)
    return [body]
