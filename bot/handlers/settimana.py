"""Handler /settimana — task ed eventi della settimana corrente."""
from __future__ import annotations

from datetime import date, timedelta

from ..database import get_week_events, get_week_tasks
from ..messages import week_digest
from .. import tgapi


def cmd_settimana(chat_id: int) -> None:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())      # Lunedì
    week_end   = week_start + timedelta(days=6)               # Domenica

    events = get_week_events()
    tasks  = get_week_tasks()
    msg = week_digest(week_start, week_end, events, tasks)
    tgapi.send_message(chat_id, msg, parse_mode="HTML")
