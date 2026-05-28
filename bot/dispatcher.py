"""
Dispatcher centrale aggiornamenti Telegram (sync).
Usa python-telegram-bot solo per deserializzare il JSON dell'update.
Tutte le chiamate API sono sync via tgapi (requests).
"""
from __future__ import annotations

from typing import Any

import telegram

from .config import (
    BOT_TOKEN,
    IDLE,
    TASK_PROJECT, TASK_TITLE, TASK_DUE,
    MEMO_PROJECT, MEMO_CONTENT, MEMO_CONFIRM,
    EV_PROJECT, EV_TITLE, EV_START, EV_DURATION, EV_ALERT,
    PROJ_SEARCH,
)
from .database import get_project
from .session import get_session, set_session, clear_session
from . import tgapi
from .handlers import task, memo, event, oggi, progetto, inbox, settimana, urgente

# Bot usato solo per de_json (nessuna chiamata API su di esso)
_parse_bot = telegram.Bot(token=BOT_TOKEN or "placeholder")


def process_update(update_data: dict[str, Any]) -> None:
    update = telegram.Update.de_json(update_data, _parse_bot)
    if update.callback_query:
        _handle_callback(update.callback_query)
    elif update.message:
        _handle_message(update.message)


# ─── Message handler ──────────────────────────────────────────────────────────

def _handle_message(msg: telegram.Message) -> None:
    if not msg.chat:
        return
    chat_id = msg.chat.id
    text = msg.text or ""

    if text.startswith("/task"):
        task.cmd_task(chat_id)
        return
    if text.startswith("/memo"):
        memo.cmd_memo(chat_id)
        return
    if text.startswith("/ev"):
        event.cmd_ev(chat_id)
        return
    if text.startswith("/oggi"):
        oggi.cmd_oggi(chat_id)
        return
    if text.startswith("/settimana"):
        settimana.cmd_settimana(chat_id)
        return
    if text.startswith("/urgente"):
        urgente.cmd_urgente(chat_id)
        return
    if text.startswith("/progetto"):
        progetto.cmd_progetto(chat_id, text)
        return
    if text.startswith("/inbox"):
        inbox.cmd_inbox(chat_id)
        return
    if text.startswith("/start") or text.startswith("/help"):
        _send_help(chat_id)
        return

    sess = get_session(chat_id)
    state = sess["state"]
    data  = sess["data"]

    if state == TASK_TITLE:
        task.on_title(chat_id, text.strip())
    elif state == TASK_DUE:
        task.on_due(chat_id, text.strip())
    elif state == MEMO_CONTENT:
        memo.on_content(chat_id, msg)
    elif state == EV_TITLE:
        event.on_title(chat_id, text.strip())
    elif state == EV_START:
        event.on_start(chat_id, text.strip())
    elif state == EV_DURATION:
        event.on_duration(chat_id, text.strip())
    elif state == EV_ALERT:
        if data.get("_waiting_custom_alert"):
            event.on_custom_alert_value(chat_id, text.strip())
    elif state == PROJ_SEARCH:
        progetto.on_search_query(chat_id, text.strip())
    else:
        if text and not text.startswith("/"):
            tgapi.send_message(chat_id, "Usa /task, /memo, /ev, /oggi, /settimana, /urgente, /progetto o /inbox.")


# ─── Callback query handler ───────────────────────────────────────────────────

def _handle_callback(cq: telegram.CallbackQuery) -> None:
    tgapi.answer_callback_query(cq.id)
    chat_id = cq.message.chat.id
    data_str = cq.data or ""
    sess = get_session(chat_id)
    state = sess["state"]

    if data_str.startswith("sel_prj:"):
        prj_id = data_str[8:]
        prj = get_project(prj_id)
        if not prj:
            tgapi.send_message(chat_id, "❌ Progetto non trovato.")
            return
        prj_code  = prj["prj_code"]
        ws_id     = prj["prj_ws_id"]
        ws_code   = prj["prj_ws_code"]
        prj_label = prj["prj_label"]

        if state == TASK_PROJECT:
            task.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label)
        elif state == MEMO_PROJECT:
            memo.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label)
        elif state == EV_PROJECT:
            event.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label)
        elif state == IDLE:
            progetto.show_project_detail(chat_id, prj_id)

    elif data_str.startswith("bucket:"):
        bucket = data_str[7:]
        if state == TASK_PROJECT:
            task.on_bucket_selected(chat_id, bucket)
        elif state == MEMO_PROJECT:
            memo.on_bucket_selected(chat_id, bucket)
        elif state == EV_PROJECT:
            event.on_bucket_selected(chat_id, bucket)

    elif data_str == "search_prj":
        set_session(chat_id, PROJ_SEARCH, sess["data"])
        tgapi.send_message(chat_id, "🔍 Inserisci il nome (parziale) del progetto:")

    elif data_str.startswith("alert:"):
        val = data_str[6:]
        if val == "custom":
            event.on_alert_custom(chat_id)
        else:
            days = int(val)
            event.on_alert(chat_id, days if days > 0 else None)

    elif data_str == "ev_conflict:ok":
        event.on_conflict_ok(chat_id)
    elif data_str == "ev_conflict:cancel":
        event.on_conflict_cancel(chat_id)

    elif data_str == "memo_confirm":
        memo.on_confirm(chat_id)
    elif data_str == "memo_cancel":
        memo.on_cancel(chat_id)

    elif data_str == "cancel":
        clear_session(chat_id)
        tgapi.send_message(chat_id, "❌ Operazione annullata.")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _send_help(chat_id: int) -> None:
    tgapi.send_message(
        chat_id,
        "📋 <b>Taskboard Bot</b>\n\n"
        "<b>Crea</b>\n"
        "/task — Nuovo task\n"
        "/memo — Nuovo memo (testo, foto, vocale)\n"
        "/ev — Nuovo evento con conflict check\n\n"
        "<b>Visualizza</b>\n"
        "/oggi — Digest giornata corrente\n"
        "/settimana — Task ed eventi della settimana\n"
        "/urgente — Task ad alta priorità aperti\n"
        "/progetto [nome] — Apri progetto\n"
        "/inbox — Record senza progetto",
        parse_mode="HTML",
    )
