"""Upload su Supabase Storage bucket tb-attachments."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from .config import STORAGE_BUCKET
from .database import db


def upload_file(file_bytes: bytes, mime_type: str, extension: str) -> str:
    """
    Carica file su Storage. Restituisce il path (es. '2026/05/18/uuid.ogg').
    """
    now = datetime.now(timezone.utc)
    file_id = str(uuid.uuid4())
    path = f"{now.strftime('%Y/%m/%d')}/{file_id}.{extension}"

    db().storage.from_(STORAGE_BUCKET).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": mime_type, "upsert": "false"},
    )
    return path


def save_attachment(rec_id: str, path: str, filename: str, mime_type: str,
                    size_bytes: int, caption: str | None = None,
                    duration_sec: int | None = None, source: str = "telegram") -> None:
    """Inserisce riga in tb_attachments."""
    payload = {
        "att_rec_id":       rec_id,
        "att_filename":     filename,
        "att_storage_path": path,
        "att_mime_type":    mime_type,
        "att_size_bytes":   size_bytes,
        "att_caption":      caption,
        "att_duration_sec": duration_sec,
        "att_source":       source,
    }
    db().table("tb_attachments").insert(payload).execute()
