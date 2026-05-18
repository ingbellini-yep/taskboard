"""Handler flusso /memo — testo, foto, vocale."""
from __future__ import annotations

import telegram

from ..config import MEMO_PROJECT, MEMO_CONTENT, MEMO_CONFIRM, IDLE
from ..database import create_record, generate_record_code
from ..groq_client import transcribe_audio
from ..keyboards import project_keyboard, confirm_keyboard
from ..messages import record_saved
from ..session import set_session, get_session, clear_session
from ..storage import upload_file, save_attachment


async def cmd_memo(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    set_session(chat_id, MEMO_PROJECT, {})
    await bot.send_message(
        chat_id,
        "📝 *Nuovo Memo*\nSeleziona il progetto:",
        parse_mode="Markdown",
        reply_markup=project_keyboard(include_inbox=True, include_small=False),
    )


async def on_project_selected(chat_id: int, prj_id: str, prj_code: str,
                               ws_id: str, ws_code: str, prj_label: str, bot: telegram.Bot) -> None:
    set_session(chat_id, MEMO_CONTENT, {
        "prj_id": prj_id, "prj_code": prj_code,
        "ws_id": ws_id, "ws_code": ws_code,
        "prj_label": prj_label, "bucket": "project",
    })
    await bot.send_message(
        chat_id,
        f"📁 *{prj_label}*\n\n📝 Scrivi il memo \\(testo, foto o vocale\\):",
        parse_mode="MarkdownV2",
    )


async def on_bucket_selected(chat_id: int, bucket: str, bot: telegram.Bot) -> None:
    label = "Inbox"
    set_session(chat_id, MEMO_CONTENT, {"bucket": bucket, "prj_id": None})
    await bot.send_message(chat_id, f"📁 *{label}*\n\n📝 Scrivi il memo \\(testo, foto o vocale\\):", parse_mode="MarkdownV2")


async def on_content(update: telegram.Update, bot: telegram.Bot) -> None:
    """Ricevuto contenuto memo (testo/foto/vocale) — chiedo conferma."""
    chat_id = update.effective_chat.id
    sess = get_session(chat_id)
    msg = update.message

    title: str = ""
    body: str | None = None
    pending_file: dict | None = None  # {bytes, mime, ext, caption, duration_sec}

    if msg.voice:
        # Vocale: scarico e trascrivo
        await bot.send_message(chat_id, "🎤 Sto trascrivendo il vocale…")
        file = await bot.get_file(msg.voice.file_id)
        audio_bytes = await file.download_as_bytearray()
        transcription = transcribe_audio(bytes(audio_bytes))
        title = _truncate_title(transcription)
        body = transcription
        pending_file = {
            "bytes":       bytes(audio_bytes),
            "mime":        "audio/ogg",
            "ext":         "ogg",
            "caption":     transcription,
            "duration":    msg.voice.duration,
            "filename":    f"{msg.voice.file_id}.ogg",
        }
        preview = f"🎤 Trascritto:\n_{transcription}_"

    elif msg.photo:
        # Foto: scarico la risoluzione più alta
        photo = msg.photo[-1]
        file = await bot.get_file(photo.file_id)
        photo_bytes = await file.download_as_bytearray()
        caption = msg.caption or ""
        title = caption if caption else "Foto"
        body = caption or None
        pending_file = {
            "bytes":    bytes(photo_bytes),
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
        await bot.send_message(chat_id, "❌ Formato non supportato. Invia testo, foto o vocale.")
        return

    # Salvo dati in sessione per conferma
    data = sess["data"]
    data.update({"title": title, "body": body, "pending_file": pending_file})
    set_session(chat_id, MEMO_CONFIRM, data)

    await bot.send_message(
        chat_id,
        f"{preview}\n\nConfermi il salvataggio?",
        parse_mode="Markdown",
        reply_markup=confirm_keyboard(),
    )


async def on_confirm(chat_id: int, bot: telegram.Bot) -> None:
    sess = get_session(chat_id)
    data = sess["data"]
    await _save_memo(chat_id, data, bot)


async def on_cancel(chat_id: int, bot: telegram.Bot) -> None:
    clear_session(chat_id)
    await bot.send_message(chat_id, "❌ Memo annullato.")


async def _save_memo(chat_id: int, data: dict, bot: telegram.Bot) -> None:
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

    # Upload allegato se presente
    pf = data.get("pending_file")
    if pf and pf.get("bytes"):
        path = upload_file(pf["bytes"], pf["mime"], pf["ext"])
        save_attachment(
            rec_id=rec_id,
            path=path,
            filename=pf["filename"],
            mime_type=pf["mime"],
            size_bytes=len(pf["bytes"]),
            caption=pf.get("caption"),
            duration_sec=pf.get("duration"),
        )

    clear_session(chat_id)
    display_code = code or bucket.upper()
    msg = record_saved(display_code, data["title"], data.get("prj_label"), None, "M")
    await bot.send_message(chat_id, msg, parse_mode="Markdown")


def _truncate_title(text: str, max_len: int = 80) -> str:
    text = text.strip().split("\n")[0]
    return text[:max_len] + "…" if len(text) > max_len else text
