"""Handler /inbox — visualizza record in inbox."""
from __future__ import annotations

import telegram

from ..database import get_inbox_records
from ..messages import inbox_list


async def cmd_inbox(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    records = get_inbox_records()
    msg = inbox_list(records)
    await bot.send_message(chat_id, msg, parse_mode="Markdown")
