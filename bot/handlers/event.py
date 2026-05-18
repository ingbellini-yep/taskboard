"""Handler flusso /ev — event con conflict check."""
from __future__ import annotations

from datetime import timedelta, timezone

import telegram

from ..config import EV_PROJECT, EV_TITLE, EV_START, EV_DURATION, EV_ALERT, IDLE
from ..database import create_record, generate_record_code, check_event_conflicts
from ..keyboards import project_keyboard, alert_keyboard, conflict_keyboard
from ..messages import event_saved, conflict_warning
from ..parsers import parse_datetime, parse_duration_minutes, has_time, format_it_datetime
from ..session import set_session, get_session, clear_session


async def cmd_ev(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    set_session(chat_id, EV_PROJECT, {})
    await bot.send_message(
        chat_id,
        "📅 *Nuovo Event*\nSeleziona il progetto:",
        parse_mode="Markdown",
        reply_markup=project_keyboard(include_inbox=True, include_small=False),
    )


async def on_project_selected(chat_id: int, prj_id: str, prj_code: str,
                               ws_id: str, ws_code: str, prj_label: str, bot: telegram.Bot) -> None:
    set_session(chat_id, EV_TITLE, {
        "prj_id": prj_id, "prj_code": prj_code,
        "ws_id": ws_id, "ws_code": ws_code,
        "prj_label": prj_label, "bucket": "project",
    })
    await bot.send_message(chat_id, f"📁 *{prj_label}*\n\n📅 Titolo dell'evento:", parse_mode="Markdown")


async def on_bucket_selected(chat_id: int, bot: telegram.Bot) -> None:
    set_session(chat_id, EV_TITLE, {"bucket": "inbox", "prj_id": None})
    await bot.send_message(chat_id, "📅 Titolo dell'evento:")


async def on_title(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    sess["data"]["ev_title"] = update.message.text.strip()
    set_session(chat_id, EV_START, sess["data"])
    await bot.send_message(
        chat_id,
        "🕐 Data e ora inizio?\n_(es. martedì 20/05 ore 10, 20/05 ore 10:30, senza orario)_",
        parse_mode="Markdown",
    )


async def on_start(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    data = sess["data"]
    raw = update.message.text.strip()

    start_dt = parse_datetime(raw)
    data["ev_start_iso"] = start_dt.isoformat() if start_dt else None
    data["ev_has_time"] = has_time(raw) if start_dt else False
    set_session(chat_id, EV_DURATION, data)

    await bot.send_message(
        chat_id,
        "⏱️ Durata?\n_(es. 1h30, 30min, 2h, non so)_",
        parse_mode="Markdown",
    )


async def on_duration(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    data = sess["data"]

    minutes = parse_duration_minutes(update.message.text)
    data["ev_duration_min"] = minutes
    set_session(chat_id, EV_ALERT, data)

    # Conflict check (solo se ha orario)
    if data.get("ev_has_time") and data.get("ev_start_iso"):
        from datetime import datetime
        start = datetime.fromisoformat(data["ev_start_iso"])
        dur = minutes or 60
        end = start + timedelta(minutes=dur)
        data["ev_end_iso"] = end.isoformat()
        set_session(chat_id, EV_ALERT, data)

        conflicts = check_event_conflicts(start, end)
        if conflicts:
            start_label = format_it_datetime(start)
            msg = conflict_warning(data["ev_title"], start_label, conflicts)
            await bot.send_message(chat_id, msg, parse_mode="Markdown", reply_markup=conflict_keyboard())
            return

    await bot.send_message(
        chat_id,
        "⏰ Avviso anticipato?",
        reply_markup=alert_keyboard(),
    )


async def on_conflict_ok(chat_id: int, bot: telegram.Bot) -> None:
    await bot.send_message(chat_id, "⏰ Avviso anticipato?", reply_markup=alert_keyboard())


async def on_conflict_cancel(chat_id: int, bot: telegram.Bot) -> None:
    clear_session(chat_id)
    await bot.send_message(chat_id, "❌ Event annullato.")


async def on_alert(chat_id: int, alert_days: int | None, bot: telegram.Bot) -> None:
    """alert_days=None → nessun avviso."""
    sess = get_session(chat_id)
    data = sess["data"]
    await _save_event(chat_id, data, alert_days, bot)


async def on_alert_custom(chat_id: int, bot: telegram.Bot) -> None:
    sess = get_session(chat_id)
    data = sess["data"]
    data["_waiting_custom_alert"] = True
    set_session(chat_id, EV_ALERT, data)
    await bot.send_message(chat_id, "Quanti giorni prima? _(inserisci un numero)_", parse_mode="Markdown")


async def on_custom_alert_value(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    data = sess["data"]
    try:
        days = int(update.message.text.strip())
    except ValueError:
        await bot.send_message(chat_id, "❌ Inserisci un numero intero.")
        return
    data.pop("_waiting_custom_alert", None)
    set_session(chat_id, EV_ALERT, data)
    await _save_event(chat_id, data, days, bot)


async def _save_event(chat_id: int, data: dict, alert_days: int | None, bot: telegram.Bot) -> None:
    prj_id = data.get("prj_id")
    bucket = data.get("bucket", "project")

    code: str | None = None
    if prj_id and bucket == "project":
        code = generate_record_code(prj_id, "EV")

    start_iso = data.get("ev_start_iso")
    end_iso = data.get("ev_end_iso")

    payload = {
        "rec_prj_id":      prj_id,
        "rec_prj_code":    data.get("prj_code"),
        "rec_ws_id":       data.get("ws_id"),
        "rec_ws_code":     data.get("ws_code"),
        "rec_code":        code,
        "rec_kind":        "EV",
        "rec_title":       data["ev_title"],
        "rec_status":      "aperto",
        "rec_priority":    2,
        "rec_event_start": start_iso,
        "rec_event_end":   end_iso,
        "rec_alert_days":  alert_days if alert_days else None,
        "rec_bucket":      bucket,
        "rec_source":      "telegram",
    }
    create_record(payload)
    clear_session(chat_id)

    display_code = code or bucket.upper()
    msg = event_saved(display_code, data["ev_title"], data.get("prj_label"), start_iso)
    if alert_days:
        msg += f"\n⏰ Avviso {alert_days}gg prima"
    await bot.send_message(chat_id, msg, parse_mode="Markdown")
