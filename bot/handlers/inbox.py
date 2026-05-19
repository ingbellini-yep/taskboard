"""Handler /inbox — visualizza record in inbox."""
from __future__ import annotations

from ..database import get_inbox_records
from ..messages import inbox_list
from .. import tgapi


def cmd_inbox(chat_id: int) -> None:
    records = get_inbox_records()
    msg = inbox_list(records)
    tgapi.send_message(chat_id, msg, parse_mode="Markdown")
