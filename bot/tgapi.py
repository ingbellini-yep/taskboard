"""Sync Telegram Bot API wrapper via requests."""
from __future__ import annotations

import requests as _req
from .config import BOT_TOKEN

_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"
_FILE = f"https://api.telegram.org/file/bot{BOT_TOKEN}"


class TelegramError(RuntimeError):
    """Errore di una chiamata a Telegram, senza URL: l'URL contiene il token del bot."""


def _request(http_method: str, url: str, label: str, **kwargs) -> _req.Response:
    """
    Esegue la chiamata e, in caso di errore, solleva TelegramError con un messaggio
    che non riporta mai l'URL. Le eccezioni di requests lo includono nel testo
    (quindi nei log di Vercel): qui vengono sostituite, non propagate.
    """
    try:
        r = _req.request(http_method, url, **kwargs)
    except _req.RequestException as exc:
        raise TelegramError(f"Telegram {label}: {type(exc).__name__}") from None
    if not r.ok:
        try:
            desc = r.json().get("description", "")
        except ValueError:
            desc = ""
        raise TelegramError(f"Telegram {label}: HTTP {r.status_code} {desc}".strip()) from None
    return r


def _post(method: str, **kwargs) -> dict:
    return _request("POST", f"{_BASE}/{method}", method, json=kwargs, timeout=8).json()


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
    r = _request("GET", f"{_BASE}/getFile", "getFile", params={"file_id": file_id}, timeout=8)
    return r.json()["result"]


def download_file(file_path: str) -> bytes:
    return _request("GET", f"{_FILE}/{file_path}", "download file", timeout=30).content
