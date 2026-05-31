"""
Handler /sub (sub-task) e /agg (aggiornamento memo).

Uso one-shot:   /sub LP-001-T-005 chiamare il fornitore
                /agg LP-001-M-002 ricevuta conferma via PEC
Uso guidato:    /sub  → chiede codice → chiede testo
Fallback:       se il codice non esiste, salva una nota in Inbox.
"""
from __future__ import annotations

from ..config import ITEM_CODE, ITEM_TEXT
from ..database import get_record_by_code, create_record_item, create_record
from ..session import set_session, get_session, clear_session
from .. import tgapi

# kind dell'item: 'subtask' o 'update'


def cmd_sub(chat_id: int, text: str) -> None:
    _start(chat_id, text, item_kind="subtask", cmd="/sub")


def cmd_agg(chat_id: int, text: str) -> None:
    _start(chat_id, text, item_kind="update", cmd="/agg")


def _start(chat_id: int, text: str, item_kind: str, cmd: str) -> None:
    # Rimuove il comando iniziale e separa codice + eventuale testo
    rest = text[len(cmd):].strip() if text.startswith(cmd) else text.strip()

    if not rest:
        # Nessun argomento → flusso guidato
        set_session(chat_id, ITEM_CODE, {"item_kind": item_kind})
        label = "sub-task" if item_kind == "subtask" else "aggiornamento"
        tgapi.send_message(
            chat_id,
            f"🔗 A quale record aggiungo il {label}?\nInvia il <b>codice</b> (es. LP-001-T-005):",
            parse_mode="HTML",
        )
        return

    parts = rest.split(maxsplit=1)
    code = parts[0]
    body = parts[1].strip() if len(parts) > 1 else ""

    parent = get_record_by_code(code)
    if not parent:
        _fallback_inbox(chat_id, code, body, item_kind)
        clear_session(chat_id)
        return

    if not body:
        # Codice valido ma manca il testo → chiedilo
        set_session(chat_id, ITEM_TEXT, {
            "item_kind": item_kind,
            "parent_id": parent["rec_id"],
            "parent_title": parent["rec_title"],
        })
        label = "sub-task" if item_kind == "subtask" else "aggiornamento"
        tgapi.send_message(
            chat_id,
            f"📎 <code>{parent['rec_code']}</code> — {parent['rec_title']}\n\n✏️ Testo del {label}:",
            parse_mode="HTML",
        )
        return

    _save(chat_id, parent, body, item_kind)
    clear_session(chat_id)


def on_code(chat_id: int, code: str) -> None:
    """Stato ITEM_CODE: l'utente ha inviato il codice del record."""
    sess = get_session(chat_id)
    item_kind = sess["data"].get("item_kind", "subtask")

    parent = get_record_by_code(code)
    if not parent:
        tgapi.send_message(
            chat_id,
            f"❌ Nessun record con codice <code>{code}</code>.\n"
            "Riprova col codice corretto, oppure /inbox per vedere i record.",
            parse_mode="HTML",
        )
        return

    set_session(chat_id, ITEM_TEXT, {
        "item_kind": item_kind,
        "parent_id": parent["rec_id"],
        "parent_title": parent["rec_title"],
        "parent_code": parent.get("rec_code"),
    })
    label = "sub-task" if item_kind == "subtask" else "aggiornamento"
    tgapi.send_message(
        chat_id,
        f"📎 <code>{parent.get('rec_code')}</code> — {parent['rec_title']}\n\n✏️ Testo del {label}:",
        parse_mode="HTML",
    )


def on_text(chat_id: int, text: str) -> None:
    """Stato ITEM_TEXT: l'utente ha inviato il testo dell'item."""
    sess = get_session(chat_id)
    data = sess["data"]
    parent = {
        "rec_id":   data["parent_id"],
        "rec_title": data.get("parent_title", ""),
        "rec_code":  data.get("parent_code"),
    }
    _save(chat_id, parent, text.strip(), data.get("item_kind", "subtask"))
    clear_session(chat_id)


def _save(chat_id: int, parent: dict, body: str, item_kind: str) -> None:
    create_record_item(parent["rec_id"], item_kind, body)
    if item_kind == "subtask":
        icon, label = "☑️", "Sub-task"
    else:
        icon, label = "📝", "Aggiornamento"
    code = parent.get("rec_code") or ""
    tgapi.send_message(
        chat_id,
        f"{icon} {label} aggiunto\n"
        f"📎 {code} — {parent['rec_title']}\n"
        f"✏️ {body}",
    )


def _fallback_inbox(chat_id: int, code: str, body: str, item_kind: str) -> None:
    """Il codice non esiste → salva una nota in Inbox da attribuire poi dalla web app."""
    label = "sub-task" if item_kind == "subtask" else "aggiornamento"
    note = f"[{label} per {code}] {body}".strip()
    create_record({
        "rec_kind":     "M",
        "rec_title":    note[:120],
        "rec_body":     note,
        "rec_status":   "aperto",
        "rec_priority": 2,
        "rec_bucket":   "inbox",
        "rec_source":   "telegram",
    })
    tgapi.send_message(
        chat_id,
        f"⚠️ Codice <code>{code}</code> non trovato.\n"
        f"Ho salvato la nota in 📥 <b>Inbox</b>: la potrai attribuire dalla web app.",
        parse_mode="HTML",
    )
