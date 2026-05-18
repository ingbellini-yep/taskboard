"""
Vercel Serverless Function — webhook Telegram.
"""
from __future__ import annotations
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.dispatcher import process_update


def handler(request, response):
    """Entry point Vercel Python serverless."""
    if request.method == "GET":
        return response.send(200, "Taskboard webhook OK")

    if request.method == "POST":
        try:
            body = request.body
            if isinstance(body, bytes):
                body = body.decode("utf-8")
            update_data = json.loads(body)
        except (json.JSONDecodeError, Exception) as e:
            return response.send(400, f"Bad Request: {e}")

        try:
            process_update(update_data)
        except Exception as exc:
            print(f"[webhook] ERROR: {exc}", file=sys.stderr)

        return response.send(200, "OK")

    return response.send(405, "Method Not Allowed")