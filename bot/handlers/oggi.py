"""Handler /oggi — vista giornata corrente."""
from __future__ import annotations

from datetime import datetime, timezone

from ..database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from ..messages import daily_digest
from .. import tgapi


def cmd_oggi(chat_id: int) -> None:
    now = datetime.now(timezone.utc)
    events = get_today_events()
    tasks  = get_today_tasks()
    alerts = get_upcoming_event_alerts()
    msg = daily_digest(now, events, tasks, alerts)
    tgapi.send_message(chat_id, msg, parse_mode="Markdown")
