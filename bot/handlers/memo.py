"""Handler flusso /memo — testo, foto, vocale."""
from __future__ import annotations

import telegram

from ..config import MEMO_PROJECT, MEMO_CONTENT, MEMO_CONFIRM
from ..database import create_record, generate_record_code
from ..groq_client import transcribe_audio
from ..keyboards import project_keyboard, confirm_keyboard
from ..messages import record_saved
from ..session import set_session, get_session, clear_session
from ..storage import upload_file, save_attachment
from .. import tgapi


def cmd_memo(chat_id: int) -> None:
    set_session(chat_id, MEMO_PROJECT, {})
    tgapi.send_message(
        chat_id,
        "📝 *Nuovo Memo*\nSeleziona il progetto:",
        parse_mode="Markdown",
        reply_markup=project_keyboard(include_inbox=True, include_small=False),
    )


def on_project_selected(chat_id: int, prj_id: str, prj_code: str,
                          ws_id: str, ws_code: str, prj_label: str) -> None:
    set_session(chat_id, MEMO_CONTENT, {
        "prj_id": prj_id, "prj_code": prj_code,
        "ws_id": ws_id, "ws_code": ws_code,
        "prj_label": prj_label, "bucket": "project",
    })
    tgapi.send_message(
        chat_id,
        f"📁 *{prj_label}*\n\n📝 Scrivi il memo (testo, foto o vocale):",
        parse_mode="Markdown",
    )


def on_bucket_selected(chat_id: int, bucket: str) -> None:
    set_session(chat_id, MEMO_CONTENT, {"bucket": bucket, "prj_id": None})
    tgapi.send_message(
        chat_id,
        "📁 *Inbox*\n\n📝 Scrivi il memo (testo, foto o vocale):",
        parse_mode="Markdown",
    )


def on_content(chat_id: int, msg: telegram.Message) -> None:
    """Ricevuto contenuto memo — trascrivo/previzzo e chiedo conferma.

    I byte del file NON vengono salvati in sessione (non è JSON-serializzabile).
    Vengono ri-scaricati da Telegram al momento della conferma usando il file_id.
    """
    sess = get_session(chat_id)

    title: str = ""
    body: str | None = None
    # pending_file contiene solo metadata + file_id (no bytes)
    pending_file: dict | None = None
    preview: str = ""

    if msg.voice:
        tgapi.send_message(chat_id, "🎤 Sto trascrivendo il vocale…")
        file_info = tgapi.get_file(msg.voice.file_id)
        audio_bytes = tgapi.download_file(file_info["file_path"])
        transcription = transcribe_audio(audio_bytes, f"{msg.voice.file_id}.ogg")
        title = _truncate_title(transcription)
        body = transcription
        pending_file = {
            "file_id":  msg.voice.file_id,
            "mime":     "audio/ogg",
            "ext":      "ogg",
            "caption":  transcription,
            "duration": msg.voice.duration,
            "filename": f"{msg.voice.file_id}.ogg",
        }
        preview = f"🎤 Trascritto:\n_{transcription}_"

    elif msg.photo:
        photo = msg.photo[-1]
        caption = msg.caption or ""
        title = caption if caption else "Foto"
        body = caption or None
        pending_file = {
            "file_id":  photo.file_id,
            "mime":     "image/jpeg",
            "ext":      "jpg",
            "caption":  caption,
            "duration": None,
            "filename": f"{photo.file_id}.jpg",
        }
        preview = f"📷 Foto ricevuta\n_{caption}_" if caption else "📷 Foto ricevuta"

    elif msg.text:
        title = _truncate_title(msg.text)
        body = msg.text if len(msg.text) > 60 else None
        preview = f"📝 _{msg.text}_"

    else:
        tgapi.send_message(chat_id, "❌ Formato non supportato. Invia testo, foto o vocale.")
        return

    data = sess["data"]
    data.update({"title": title, "body": body, "pending_file": pending_file})
    set_session(chat_id, MEMO_CONFIRM, data)

    tgapi.send_message(
        chat_id,
        f"{preview}\n\nConfermi il salvataggio?",
        parse_mode="Markdown",
        reply_markup=confirm_keyboard(),
    )


def on_confirm(chat_id: int) -> None:
    sess = get_session(chat_id)
    _save_memo(chat_id, sess["data"])


def on_cancel(chat_id: int) -> None:
    clear_session(chat_id)
    tgapi.send_message(chat_id, "❌ Memo annullato.")


def _save_memo(chat_id: int, data: dict) -> None:
    prj_id = data.get("prj_id")
    bucket = data.get("bucket", "project")

    code: str | None = None
    if prj_id and bucket == "project":
        code = generate_record_code(prj_id, "M")

    payload = {
        "rec_prj_id":   prj_id,
        "rec_prj_code": data.get("prj_code"),
        "rec_ws_id":    data.get("ws_id"),
        "rec_ws_code":  data.get("ws_code"),
        "rec_code":     code,
        "rec_kind":     "M",
        "rec_title":    data["title"],
        "rec_body":     data.get("body"),
        "rec_status":   "aperto",
        "rec_priority": 2,
        "rec_bucket":   bucket,
        "rec_source":   "telegram",
    }
    record = create_record(payload)
    rec_id = record["rec_id"]

    pf = data.get("pending_file")
    if pf and pf.get("file_id"):
        file_info = tgapi.get_file(pf["file_id"])
        file_bytes = tgapi.download_file(file_info["file_path"])
        path = upload_file(file_bytes, pf["mime"], pf["ext"])
        save_attachment(
            rec_id=rec_id,
            path=path,
            filename=pf["filename"],
            mime_type=pf["mime"],
            size_bytes=len(file_bytes),
            caption=pf.get("caption"),
            duration_sec=pf.get("duration"),
        )

    clear_session(chat_id)
    display_code = code or bucket.upper()
    msg = record_saved(display_code, data["title"], data.get("prj_label"), None, "M")
    tgapi.send_message(chat_id, msg, parse_mode="Markdown")


def _truncate_title(text: str, max_len: int = 80) -> str:
    text = text.strip().split("\n")[0]
    return text[:max_len] + "…" if len(text) > max_len else text
