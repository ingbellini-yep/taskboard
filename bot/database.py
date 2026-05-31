"""Supabase client e query principali per il bot."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def db() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


# ─── Workspace ────────────────────────────────────────────────────────────────

def get_workspaces() -> list[dict]:
    r = db().table("tb_workspaces").select("*").eq("ws_active", True).order("ws_sort_order").execute()
    return r.data or []


# ─── Progetti ─────────────────────────────────────────────────────────────────

def get_recent_projects(limit: int = 5) -> list[dict]:
    r = (
        db().table("tb_projects")
        .select("prj_id, prj_code, prj_label, prj_ws_id, prj_ws_code")
        .in_("prj_status", ["active", "suspended"])
        .order("prj_updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return r.data or []


def search_projects(query: str) -> list[dict]:
    r = (
        db().table("tb_projects")
        .select("prj_id, prj_code, prj_label, prj_ws_id, prj_ws_code")
        .in_("prj_status", ["active", "suspended"])
        .ilike("prj_label", f"%{query}%")
        .order("prj_updated_at", desc=True)
        .limit(8)
        .execute()
    )
    return r.data or []


def get_project(prj_id: str) -> dict | None:
    r = db().table("tb_projects").select("*").eq("prj_id", prj_id).single().execute()
    return r.data


# ─── Record ───────────────────────────────────────────────────────────────────

def generate_record_code(prj_id: str, kind: str) -> str:
    r = db().rpc("tb_generate_record_code", {"p_prj_id": prj_id, "p_kind": kind}).execute()
    return r.data


def generate_project_code(ws_code: str) -> str:
    r = db().rpc("tb_generate_project_code", {"p_ws_code": ws_code}).execute()
    return r.data


def create_record(payload: dict[str, Any]) -> dict:
    r = db().table("tb_records").insert(payload).execute()
    return r.data[0]


def get_record_by_code(rec_code: str) -> dict | None:
    """Trova un record dal suo rec_code (case-insensitive). Ritorna None se assente."""
    r = (
        db().table("tb_records")
        .select("rec_id, rec_code, rec_kind, rec_title, rec_status")
        .ilike("rec_code", rec_code.strip())
        .limit(1)
        .execute()
    )
    rows = r.data or []
    return rows[0] if rows else None


def create_record_item(parent_id: str, kind: str, text: str,
                       priority: int | None = None, due_date: str | None = None) -> dict:
    """Crea un sub-task ('subtask') o un aggiornamento ('update') figlio di un record."""
    payload = {
        "item_parent_id": parent_id,
        "item_kind":      kind,
        "item_text":      text,
        "item_priority":  priority,
        "item_due_date":  due_date,
    }
    r = db().table("tb_record_items").insert(payload).execute()
    return r.data[0]


def get_inbox_records(limit: int = 20) -> list[dict]:
    r = (
        db().table("tb_records")
        .select("rec_id, rec_kind, rec_title, rec_body, rec_created_at")
        .eq("rec_bucket", "inbox")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .order("rec_created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return r.data or []


def assign_inbox_to_project(rec_id: str, prj_id: str, prj_code: str, ws_id: str, ws_code: str, rec_kind: str) -> None:
    code = generate_record_code(prj_id, rec_kind)
    db().table("tb_records").update({
        "rec_bucket":   "project",
        "rec_prj_id":   prj_id,
        "rec_prj_code": prj_code,
        "rec_ws_id":    ws_id,
        "rec_ws_code":  ws_code,
        "rec_code":     code,
    }).eq("rec_id", rec_id).execute()


# ─── Conflict check ───────────────────────────────────────────────────────────

def check_event_conflicts(start: datetime, end: datetime, exclude_id: str | None = None) -> list[dict]:
    params: dict[str, Any] = {
        "p_start": start.isoformat(),
        "p_end":   end.isoformat(),
    }
    if exclude_id:
        params["p_exclude_id"] = exclude_id
    r = db().rpc("tb_check_event_conflicts", params).execute()
    return r.data or []


# ─── Query digest mattutino ───────────────────────────────────────────────────

def get_today_events() -> list[dict]:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = today_start.replace(hour=23, minute=59, second=59)
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_event_start, rec_event_end, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "EV")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .gte("rec_event_start", today_start.isoformat())
        .lte("rec_event_start", today_end.isoformat())
        .order("rec_event_start")
        .execute()
    )
    return r.data or []


def get_today_tasks() -> list[dict]:
    today = date.today().isoformat()
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "T")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .lte("rec_due_date", today)
        .order("rec_priority")
        .limit(10)
        .execute()
    )
    return r.data or []


def get_week_events() -> list[dict]:
    """Eventi da oggi a domenica della settimana corrente."""
    from datetime import timedelta
    today = date.today()
    week_sunday = today + timedelta(days=(6 - today.weekday()))
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc)
    week_end    = datetime(week_sunday.year, week_sunday.month, week_sunday.day, 23, 59, 59, tzinfo=timezone.utc)
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_event_start, rec_event_end, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "EV")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .gte("rec_event_start", today_start.isoformat())
        .lte("rec_event_start", week_end.isoformat())
        .order("rec_event_start")
        .execute()
    )
    return r.data or []


def get_week_tasks() -> list[dict]:
    """Task in scadenza entro domenica corrente (inclusi scaduti)."""
    from datetime import timedelta
    today = date.today()
    week_sunday = today + timedelta(days=(6 - today.weekday()))
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_due_date, rec_priority, rec_status, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "T")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .not_.is_("rec_due_date", "null")
        .lte("rec_due_date", week_sunday.isoformat())
        .order("rec_due_date")
        .execute()
    )
    return r.data or []


def get_urgent_tasks() -> list[dict]:
    """Task priorità alta (1) aperti/in_progress/sospesi."""
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_due_date, rec_status, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "T")
        .eq("rec_priority", 1)
        .in_("rec_status", ["aperto", "in_progress", "sospeso"])
        .order("rec_due_date", nullsfirst=False)
        .execute()
    )
    # Riordina: scaduti prima, poi per data, poi senza data
    today = date.today().isoformat()
    with_date    = sorted([r for r in (r.data or []) if r.get("rec_due_date")],
                          key=lambda x: x["rec_due_date"])
    without_date = [r for r in (r.data or []) if not r.get("rec_due_date")]
    overdue  = [r for r in with_date if r["rec_due_date"] < today]
    upcoming = [r for r in with_date if r["rec_due_date"] >= today]
    return overdue + upcoming + without_date


SMALL_PRJ_ID = "fb30b6d8-1590-41b5-af7d-fce6533b5e01"


def get_upcoming_event_alerts() -> list[dict]:
    """Events where today falls within the alert window."""
    today = date.today()
    r = (
        db().table("tb_records")
        .select("rec_code, rec_title, rec_event_start, rec_alert_days, rec_prj_code, prj_label:tb_projects!rec_prj_id(prj_label)")
        .eq("rec_kind", "EV")
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .not_.is_("rec_alert_days", "null")
        .not_.is_("rec_event_start", "null")
        .execute()
    )
    alerts = []
    for ev in (r.data or []):
        event_start = datetime.fromisoformat(ev["rec_event_start"]).date()
        days_to_event = (event_start - today).days
        if 0 < days_to_event <= ev["rec_alert_days"]:
            ev["days_to_event"] = days_to_event
            alerts.append(ev)
    return alerts
