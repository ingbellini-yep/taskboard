"""
Dispatcher centrale aggiornamenti Telegram.
Riceve il dict JSON dell'update, crea oggetti telegram, smista ai handler.
Progettato per ambiente serverless (stateless, niente ConversationHandler).
"""
from __future__ import annotations

import asyncio
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

from .handlers import task, memo, event, oggi, progetto, inbox


async def dispatch(update_data: dict[str, Any]) -> None:
    # async with bot: gestisce initialize()/shutdown() — necessario in PTB v20+
    async with telegram.Bot(token=BOT_TOKEN) as bot:
        update = telegram.Update.de_json(update_data, bot)
        if update.callback_query:
            await _handle_callback(update.callback_query, bot)
        elif update.message:
            await _handle_message(update.message, bot)


# ─── Message handler ──────────────────────────────────────────────────────────

async def _handle_message(msg: telegram.Message, bot: telegram.Bot) -> None:
    if not msg.chat:
        return
    chat_id = msg.chat.id
    text = msg.text or ""

    # Comandi (update sintetico senza get_bot() — usiamo msg direttamente)
    upd = _make_update(msg)
    if text.startswith("/task"):
        await task.cmd_task(upd, bot)
        return
    if text.startswith("/memo"):
        await memo.cmd_memo(upd, bot)
        return
    if text.startswith("/ev"):
        await event.cmd_ev(upd, bot)
        return
    if text.startswith("/oggi"):
        await oggi.cmd_oggi(upd, bot)
        return
    if text.startswith("/progetto"):
        await progetto.cmd_progetto(upd, bot)
        return
    if text.startswith("/inbox"):
        await inbox.cmd_inbox(upd, bot)
        return
    if text.startswith("/start") or text.startswith("/help"):
        await _send_help(chat_id, bot)
        return

    # Testo/media libero: elaboro in base allo stato sessione
    sess = get_session(chat_id)
    state = sess["state"]
    data  = sess["data"]

    if state == TASK_TITLE:
        await task.on_title(upd, bot)
    elif state == TASK_DUE:
        await task.on_due(upd, bot)
    elif state == MEMO_CONTENT:
        await memo.on_content(upd, bot)
    elif state == EV_TITLE:
        await event.on_title(upd, bot)
    elif state == EV_START:
        await event.on_start(upd, bot)
    elif state == EV_DURATION:
        await event.on_duration(upd, bot)
    elif state == EV_ALERT:
        if data.get("_waiting_custom_alert"):
            await event.on_custom_alert_value(upd, bot)
    elif state == PROJ_SEARCH:
        await progetto.on_search_query(upd, bot)
    else:
        if text and not text.startswith("/"):
            await bot.send_message(chat_id, "Usa /task, /memo, /ev, /oggi, /progetto o /inbox.")


# ─── Callback query handler ───────────────────────────────────────────────────

async def _handle_callback(cq: telegram.CallbackQuery, bot: telegram.Bot) -> None:
    await cq.answer()
    chat_id = cq.message.chat.id
    data_str = cq.data or ""
    sess = get_session(chat_id)
    state = sess["state"]

    # ── Progetto selezionato ───────────────────────────────────────────────
    if data_str.startswith("sel_prj:"):
        prj_id = data_str[8:]
        prj = get_project(prj_id)
        if not prj:
            await bot.send_message(chat_id, "❌ Progetto non trovato.")
            return
        prj_code  = prj["prj_code"]
        ws_id     = prj["prj_ws_id"]
        ws_code   = prj["prj_ws_code"]
        prj_label = prj["prj_label"]

        if state == TASK_PROJECT:
            await task.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label, bot)
        elif state == MEMO_PROJECT:
            await memo.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label, bot)
        elif state == EV_PROJECT:
            await event.on_project_selected(chat_id, prj_id, prj_code, ws_id, ws_code, prj_label, bot)
        elif state == IDLE:
            await progetto.show_project_detail(chat_id, prj_id, bot)

    # ── Bucket selezionato (inbox / small) ────────────────────────────────
    elif data_str.startswith("bucket:"):
        bucket = data_str[7:]
        if state == TASK_PROJECT:
            await task.on_bucket_selected(chat_id, bucket, bot)
        elif state == MEMO_PROJECT:
            await memo.on_bucket_selected(chat_id, bucket, bot)
        elif state == EV_PROJECT:
            await event.on_bucket_selected(chat_id, bucket, bot)

    # ── Ricerca progetto ───────────────────────────────────────────────────
    elif data_str == "search_prj":
        set_session(chat_id, PROJ_SEARCH, sess["data"])
        await bot.send_message(chat_id, "🔍 Inserisci il nome (parziale) del progetto:")

    # ── Alert days ────────────────────────────────────────────────────────
    elif data_str.startswith("alert:"):
        val = data_str[6:]
        if val == "custom":
            await event.on_alert_custom(chat_id, bot)
        else:
            days = int(val)
            await event.on_alert(chat_id, days if days > 0 else None, bot)

    # ── Conflict response ─────────────────────────────────────────────────
    elif data_str == "ev_conflict:ok":
        await event.on_conflict_ok(chat_id, bot)
    elif data_str == "ev_conflict:cancel":
        await event.on_conflict_cancel(chat_id, bot)

    # ── Memo confirm/cancel ───────────────────────────────────────────────
    elif data_str == "memo_confirm":
        await memo.on_confirm(chat_id, bot)
    elif data_str == "memo_cancel":
        await memo.on_cancel(chat_id, bot)

    # ── Annulla generico ──────────────────────────────────────────────────
    elif data_str == "cancel":
        clear_session(chat_id)
        await bot.send_message(chat_id, "❌ Operazione annullata.")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_update(msg: telegram.Message) -> telegram.Update:
    return telegram.Update(update_id=0, message=msg)


async def _send_help(chat_id: int, bot: telegram.Bot) -> None:
    await bot.send_message(
        chat_id,
        "📋 *Taskboard Bot*\n\n"
        "/task — Nuovo task\n"
        "/memo — Nuovo memo \\(testo, foto, vocale\\)\n"
        "/ev — Nuovo evento con conflict check\n"
        "/oggi — Digest giornata corrente\n"
        "/progetto \\[nome\\] — Apri progetto\n"
        "/inbox — Visualizza record senza progetto",
        parse_mode="MarkdownV2",
    )


def process_update(update_data: dict[str, Any]) -> None:
    """Entry point sincrono per Vercel — loop fresco ad ogni chiamata (warm-start safe)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(dispatch(update_data))
    finally:
        loop.close()
        asyncio.set_event_loop(None)
