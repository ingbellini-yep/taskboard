"""Sync Telegram Bot API wrapper via requests."""
from __future__ import annotations

import requests as _req
from .config import BOT_TOKEN

_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"
_FILE = f"https://api.telegram.org/file/bot{BOT_TOKEN}"


def _post(method: str, **kwargs) -> dict:
    r = _req.post(f"{_BASE}/{method}", json=kwargs, timeout=8)
    r.raise_for_status()
    return r.json()


def send_message(chat_id: int, text: str, *,
                 parse_mode: str | None = None,
                 reply_markup=None) -> dict:
    kw: dict = {"chat_id": chat_id, "text": text}
    if parse_mode:
        kw["parse_mode"] = parse_mode
    if reply_markup is not None:
        kw["reply_markup"] = (
            reply_markup.to_dict() if hasattr(reply_markup, "to_dict") else reply_markup
        )
    return _post("sendMessage", **kw)


def answer_callback_query(cq_id: str) -> None:
    _post("answerCallbackQuery", callback_query_id=cq_id)


def get_file(file_id: str) -> dict:
    r = _req.get(f"{_BASE}/getFile", params={"file_id": file_id}, timeout=8)
    r.raise_for_status()
    return r.json()["result"]


def download_file(file_path: str) -> bytes:
    r = _req.get(f"{_FILE}/{file_path}", timeout=30)
    r.raise_for_status()
    return r.content
