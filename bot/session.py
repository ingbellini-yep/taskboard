"""Gestione stato conversazione per-chat su Supabase (necessario per serverless)."""
from __future__ import annotations

from typing import Any
from .database import db
from .config import IDLE


def get_session(chat_id: int) -> dict[str, Any]:
    r = db().table("tb_bot_sessions").select("ses_state, ses_data").eq("ses_chat_id", chat_id).execute()
    if r.data:
        return {"state": r.data[0]["ses_state"], "data": r.data[0]["ses_data"] or {}}
    return {"state": IDLE, "data": {}}


def set_session(chat_id: int, state: str, data: dict[str, Any] | None = None) -> None:
    payload = {"ses_chat_id": chat_id, "ses_state": state, "ses_data": data or {}, "ses_updated_at": "now()"}
    db().table("tb_bot_sessions").upsert(payload, on_conflict="ses_chat_id").execute()


def clear_session(chat_id: int) -> None:
    set_session(chat_id, IDLE, {})


def update_data(chat_id: int, updates: dict[str, Any]) -> None:
    """Merge updates into existing session data."""
    sess = get_session(chat_id)
    merged = {**sess["data"], **updates}
    set_session(chat_id, sess["state"], merged)
