"""
Vercel Serverless Function — riceve aggiornamenti Telegram via webhook POST.
URL: https://<dominio>/api/webhook
"""
from __future__ import annotations

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.dispatcher import process_update


class handler:

    def __init__(self, request, client_address, server):
        self.request = request
        self.client_address = client_address
        self.server = server

    def do_POST(self, environ, start_response):
        # Leggo body
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0))
        except (ValueError, TypeError):
            content_length = 0

        raw = environ["wsgi.input"].read(content_length)

        try:
            update_data = json.loads(raw)
        except json.JSONDecodeError:
            start_response("400 Bad Request", [("Content-Type", "text/plain")])
            return [b"Bad Request"]

        # Processo l'aggiornamento
        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        start_response("200 OK", [("Content-Type", "text/plain")])
        return [b"OK"]

    def do_GET(self, environ, start_response):
        start_response("200 OK", [("Content-Type", "text/plain")])
        return [b"Taskboard webhook OK"]