"""Handler flusso /task."""
from __future__ import annotations

from datetime import timezone

import telegram

from ..config import TASK_PROJECT, TASK_TITLE, TASK_DUE, IDLE
from ..database import create_record, generate_record_code
from ..keyboards import project_keyboard
from ..messages import record_saved
from ..parsers import parse_datetime
from ..session import set_session, get_session, clear_session


async def cmd_task(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    set_session(chat_id, TASK_PROJECT, {})
    await bot.send_message(
        chat_id,
        "✏️ *Nuovo Task*\nSeleziona il progetto:",
        parse_mode="Markdown",
        reply_markup=project_keyboard(include_inbox=True, include_small=True),
    )


async def on_project_selected(chat_id: int, prj_id: str, prj_code: str,
                               ws_id: str, ws_code: str, prj_label: str, bot: telegram.Bot) -> None:
    set_session(chat_id, TASK_TITLE, {
        "prj_id": prj_id, "prj_code": prj_code,
        "ws_id": ws_id, "ws_code": ws_code,
        "prj_label": prj_label, "bucket": "project",
    })
    await bot.send_message(chat_id, f"📁 *{prj_label}*\n\n✏️ Descrivi il task:", parse_mode="Markdown")


async def on_bucket_selected(chat_id: int, bucket: str, bot: telegram.Bot) -> None:
    label = "Inbox" if bucket == "inbox" else "Small Tasks"
    set_session(chat_id, TASK_TITLE, {"bucket": bucket, "prj_id": None})
    await bot.send_message(chat_id, f"📁 *{label}*\n\n✏️ Descrivi il task:", parse_mode="Markdown")


async def on_title(update: telegram.Update, bot: telegram.Bot) -> None:
    """Ricevuto il titolo del task — chiedo scadenza."""
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    title = update.message.text.strip()

    sess["data"]["title"] = title
    set_session(chat_id, TASK_DUE, sess["data"])
    await bot.send_message(
        chat_id,
        "⏰ Scadenza? _(es. domani, 25/05, 25/05 ore 10, nessuna)_",
        parse_mode="Markdown",
    )


async def on_due(update: telegram.Update, bot: telegram.Bot) -> None:
    """Ricevuta la scadenza — salvo il task."""
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    data = sess["data"]

    due_dt = parse_datetime(update.message.text)
    due_iso = due_dt.isoformat() if due_dt else None

    prj_id = data.get("prj_id")
    bucket = data.get("bucket", "project")

    code: str | None = None
    if prj_id and bucket == "project":
        code = generate_record_code(prj_id, "T")

    payload = {
        "rec_prj_id":   prj_id,
        "rec_prj_code": data.get("prj_code"),
        "rec_ws_id":    data.get("ws_id"),
        "rec_ws_code":  data.get("ws_code"),
        "rec_code":     code,
        "rec_kind":     "T",
        "rec_title":    data["title"],
        "rec_status":   "aperto",
        "rec_priority": 2,
        "rec_due_date": due_iso,
        "rec_bucket":   bucket,
        "rec_source":   "telegram",
    }
    create_record(payload)
    clear_session(chat_id)

    display_code = code or bucket.upper()
    msg = record_saved(display_code, data["title"], data.get("prj_label"), due_iso, "T")
    await bot.send_message(chat_id, msg, parse_mode="Markdown")
