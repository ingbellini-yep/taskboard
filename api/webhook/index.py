"""
Vercel Serverless Function — webhook Telegram.
Vercel rileva la variabile 'app' (WSGI Flask) automaticamente.
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, Response
from bot.config import WEBHOOK_SECRET
from bot.dispatcher import process_update

app = Flask(__name__)


@app.route("/", methods=["GET"])
@app.route("/api/webhook", methods=["GET"])
def webhook_get():
    return "Taskboard webhook OK", 200


@app.route("/", methods=["POST"])
@app.route("/api/webhook", methods=["POST"])
def webhook_post():
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if WEBHOOK_SECRET and secret != WEBHOOK_SECRET:
        return Response("Forbidden", status=403)

    data = request.get_json(silent=True)
    if not data:
        return Response("Bad Request", status=400)

    try:
        process_update(data)
    except Exception as exc:
        print(f"[webhook] ERROR: {exc}", file=sys.stderr)

    return "OK", 200
