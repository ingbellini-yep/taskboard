"""Handler /urgente — task ad alta priorità aperti."""
from __future__ import annotations

from ..database import get_urgent_tasks
from ..messages import urgent_list
from .. import tgapi


def cmd_urgente(chat_id: int) -> None:
    tasks = get_urgent_tasks()
    msg = urgent_list(tasks)
    tgapi.send_message(chat_id, msg, parse_mode="HTML")
