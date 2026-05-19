"""
Vercel Serverless Function — digest mattutino.
Schedule vercel.json: "20 5 * * *" UTC = 7:20 CEST / 6:20 CET
Vercel rileva la variabile 'app' (WSGI Flask) automaticamente.
"""
from __future__ import annotations

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, Response
from bot.config import CRON_SECRET, TELEGRAM_CHAT_ID
from bot.database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from bot.messages import daily_digest
from bot import tgapi

app = Flask(__name__)


@app.route("/", methods=["GET"])
@app.route("/api/cron", methods=["GET"])
def cron_handler():
    auth = request.headers.get("Authorization", "")
    if CRON_SECRET and auth != f"Bearer {CRON_SECRET}":
        return Response("Unauthorized", status=401)

    try:
        now = datetime.now(timezone.utc)
        events = get_today_events()
        tasks  = get_today_tasks()
        alerts = get_upcoming_event_alerts()
        msg = daily_digest(now, events, tasks, alerts)
        tgapi.send_message(TELEGRAM_CHAT_ID, msg, parse_mode="Markdown")
        return "Digest inviato", 200
    except Exception as exc:
        print(f"[cron] ERROR: {exc}", file=sys.stderr)
        return Response(str(exc), status=500)
