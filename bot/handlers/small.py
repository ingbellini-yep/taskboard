"""Handler flusso /small — Small Tasks & To Do."""
from __future__ import annotations

from ..config import SMALL_TITLE, SMALL_DUE, IDLE
from ..database import create_record, SMALL_PRJ_ID
from ..keyboards import small_priority_keyboard, small_category_keyboard
from ..parsers import parse_datetime
from ..session import set_session, get_session, clear_session
from .. import tgapi


def cmd_small_quick(chat_id: int, title: str) -> None:
    """Crea small task con priorità normale, nessuna categoria, nessuna scadenza.
    Usato dalle frasi trigger: 'todo: titolo', 'da fare: titolo', ecc.
    """
    payload = {
        "rec_prj_id":   SMALL_PRJ_ID,
        "rec_prj_code": "SMALL",
        "rec_ws_id":    None,
        "rec_ws_code":  None,
        "rec_code":     None,
        "rec_kind":     "T",
        "rec_title":    title,
        "rec_status":   "aperto",
        "rec_priority": 2,
        "rec_due_date": None,
        "rec_bucket":   "small_tasks",
        "rec_source":   "telegram",
    }
    create_record(payload)
    tgapi.send_message(chat_id, f"⚡ Small task salvato:\n📝 {title}")


def cmd_small(chat_id: int) -> None:
    set_session(chat_id, SMALL_TITLE, {})
    tgapi.send_message(
        chat_id,
        "⚡ *Small Task / To Do*\n\nDescrivi il task:",
        parse_mode="Markdown",
    )


def on_title(chat_id: int, title: str) -> None:
    sess = get_session(chat_id)
    sess["data"]["title"] = title
    # Manteniamo SMALL_TITLE e attendiamo la priorità via callback
    set_session(chat_id, SMALL_TITLE, sess["data"])
    tgapi.send_message(
        chat_id,
        "📊 Priorità?",
        reply_markup=small_priority_keyboard(),
    )


def on_priority(chat_id: int, priority: int) -> None:
    sess = get_session(chat_id)
    sess["data"]["priority"] = priority
    set_session(chat_id, SMALL_TITLE, sess["data"])
    tgapi.send_message(
        chat_id,
        "🏷 Categoria? _(opzionale)_",
        parse_mode="Markdown",
        reply_markup=small_category_keyboard(),
    )


def on_category(chat_id: int, category: str | None) -> None:
    sess = get_session(chat_id)
    sess["data"]["category"] = category
    set_session(chat_id, SMALL_DUE, sess["data"])
    tgapi.send_message(
        chat_id,
        "⏰ Scadenza? _(es. domani, 25/06 — oppure 'no' per saltare)_",
        parse_mode="Markdown",
    )


def on_due(chat_id: int, text: str) -> None:
    sess = get_session(chat_id)
    data = sess["data"]

    due_iso: str | None = None
    if text.lower() not in ("no", "nessuna", "skip", "-"):
        dt = parse_datetime(text)
        due_iso = dt.isoformat() if dt else None

    ws_code = data.get("category")  # LP / RB / PNRR / FAM / PERS / None

    payload = {
        "rec_prj_id":   SMALL_PRJ_ID,
        "rec_prj_code": "SMALL",
        "rec_ws_id":    None,
        "rec_ws_code":  ws_code,
        "rec_code":     None,
        "rec_kind":     "T",
        "rec_title":    data["title"],
        "rec_status":   "aperto",
        "rec_priority": data.get("priority", 2),
        "rec_due_date": due_iso,
        "rec_bucket":   "small_tasks",
        "rec_source":   "telegram",
    }
    create_record(payload)
    clear_session(chat_id)

    cat_label = ws_code or "Nessuna"
    pri_icon = {1: "🔴", 2: "🔵", 3: "⚪"}.get(data.get("priority", 2), "🔵")
    lines = [
        "✅ Small task salvato",
        f"📝 {data['title']}",
        f"{pri_icon} Priorità: {['Alta', 'Normale', 'Bassa'][data.get('priority', 2) - 1]}",
        f"🏷 Categoria: {cat_label}",
    ]
    if due_iso:
        from ..parsers import format_it_date
        from datetime import datetime
        lines.append(f"⏰ Scadenza: {format_it_date(datetime.fromisoformat(due_iso))}")

    tgapi.send_message(chat_id, "\n".join(lines))
