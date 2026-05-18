"""Handler /oggi — vista giornata corrente."""
from __future__ import annotations

from datetime import datetime, timezone

import telegram

from ..database import get_today_events, get_today_tasks, get_upcoming_event_alerts
from ..messages import daily_digest


async def cmd_oggi(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    now = datetime.now(timezone.utc)

    events = get_today_events()
    tasks  = get_today_tasks()
    alerts = get_upcoming_event_alerts()

    msg = daily_digest(now, events, tasks, alerts)
    await bot.send_message(chat_id, msg, parse_mode="Markdown")
