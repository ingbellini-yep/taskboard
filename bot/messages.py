"""Formattatori messaggi Telegram."""
from __future__ import annotations

from datetime import datetime, timezone

from .parsers import format_it_datetime, format_it_date


def record_saved(code: str, title: str, prj_label: str | None, due_date: str | None, kind: str) -> str:
    icons = {"T": "✅", "M": "📝", "EV": "📅"}
    icon = icons.get(kind, "✅")
    lines = [
        f"{icon} {kind_label(kind)} salvato",
        f"📎 `{code}`",
    ]
    if prj_label:
        lines.append(f"📁 {prj_label}")
    lines.append(f"📝 {title}")
    if due_date:
        dt = datetime.fromisoformat(due_date)
        lines.append(f"⏰ {format_it_date(dt)}")
    return "\n".join(lines)


def event_saved(code: str, title: str, prj_label: str | None, start: str | None) -> str:
    lines = [
        "✅ Event salvato",
        f"📎 `{code}`",
    ]
    if prj_label:
        lines.append(f"📁 {prj_label}")
    lines.append(f"📝 {title}")
    if start:
        dt = datetime.fromisoformat(start)
        lines.append(f"📅 {format_it_datetime(dt)}")
    return "\n".join(lines)


def conflict_warning(new_title: str, new_start: str, conflicts: list[dict]) -> str:
    lines = [
        "⚠️ *CONFLITTO RILEVATO*\n",
        f"Stai aggiungendo:\n  📅 {new_title} — {new_start}\n",
        "Conflitto con:",
    ]
    for c in conflicts[:3]:
        start = datetime.fromisoformat(c["rec_event_start"])
        lines.append(f"  `{c['rec_code']}` — {c['rec_title']}")
        lines.append(f"  📅 {format_it_datetime(start)}")
    lines.append("\nProcedi comunque?")
    return "\n".join(lines)


def daily_digest(today: datetime, events: list[dict], tasks: list[dict], alerts: list[dict]) -> str:
    giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
    lines = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"📋 OGGI — {giorni[today.weekday()]} {today.strftime('%d/%m/%Y')}",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ]

    if events:
        lines.append("\n📅 *APPUNTAMENTI*")
        for ev in events:
            start = datetime.fromisoformat(ev["rec_event_start"])
            end_str = ""
            if ev.get("rec_event_end"):
                end = datetime.fromisoformat(ev["rec_event_end"])
                end_str = f"→{end.strftime('%H:%M')}"
            prj = ""
            if ev.get("prj_label") and isinstance(ev["prj_label"], dict):
                prj = f" — {ev['prj_label']['prj_label']}"
            elif ev.get("prj_label"):
                prj = f" — {ev['prj_label']}"
            lines.append(f"  `{start.strftime('%H:%M')}`{end_str}  {ev['rec_title']}{prj}")
            lines.append(f"  {ev['rec_code']}")

    if tasks:
        lines.append("\n✅ *TASK IN SCADENZA OGGI*")
        for t in tasks:
            prj = ""
            if t.get("prj_label") and isinstance(t["prj_label"], dict):
                prj = f"  {t['prj_label']['prj_label']}"
            lines.append(f"  `{t['rec_code']}`  {t['rec_title']}{prj}")

    if alerts:
        lines.append("\n⏰ *AVVISI ANTICIPATI*")
        for a in alerts:
            start = datetime.fromisoformat(a["rec_event_start"])
            days = a.get("days_to_event", "?")
            prj = ""
            if a.get("prj_label") and isinstance(a["prj_label"], dict):
                prj = f" — {a['prj_label']['prj_label']}"
            lines.append(f"  [{days}gg] `{a['rec_code']}`  {a['rec_title']}{prj}")
            lines.append(f"  {format_it_datetime(start)}")

    if not events and not tasks and not alerts:
        lines.append("\n🎉 Nessun impegno per oggi!")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return "\n".join(lines)


def kind_label(k: str) -> str:
    return {"T": "Task", "M": "Memo", "EV": "Event"}.get(k, k)


def inbox_list(records: list[dict]) -> str:
    if not records:
        return "📥 Inbox vuota"
    lines = ["📥 *INBOX*\n"]
    for r in records[:10]:
        kind = kind_label(r["rec_kind"])
        lines.append(f"  [{kind}] {r['rec_title']}")
        lines.append(f"  `{r['rec_id'][:8]}…`\n")
    return "\n".join(lines)
