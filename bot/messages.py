"""Formattatori messaggi Telegram."""
from __future__ import annotations

from datetime import datetime, timezone

from .parsers import format_it_datetime, format_it_date


def record_saved(code: str, title: str, prj_label: str | None, due_date: str | None, kind: str) -> str:
    icons = {"T": "✅", "M": "📝", "EV": "📅"}
    icon = icons.get(kind, "✅")
    lines = [
        f"{icon} {kind_label(kind)} salvato",
        f"📎 <code>{code}</code>",
    ]
    if prj_label:
        lines.append(f"📁 {_esc(prj_label)}")
    lines.append(f"📝 {_esc(title)}")
    if due_date:
        dt = datetime.fromisoformat(due_date)
        lines.append(f"⏰ {format_it_date(dt)}")
    return "\n".join(lines)


def event_saved(code: str, title: str, prj_label: str | None, start: str | None) -> str:
    lines = [
        "✅ Event salvato",
        f"📎 <code>{code}</code>",
    ]
    if prj_label:
        lines.append(f"📁 {_esc(prj_label)}")
    lines.append(f"📝 {_esc(title)}")
    if start:
        dt = datetime.fromisoformat(start)
        lines.append(f"📅 {format_it_datetime(dt)}")
    return "\n".join(lines)


def conflict_warning(new_title: str, new_start: str, conflicts: list[dict]) -> str:
    lines = [
        "⚠️ <b>CONFLITTO RILEVATO</b>\n",
        f"Stai aggiungendo:\n  📅 {_esc(new_title)} — {_esc(new_start)}\n",
        "Conflitto con:",
    ]
    for c in conflicts[:3]:
        start = datetime.fromisoformat(c["rec_event_start"])
        lines.append(f"  <code>{c['rec_code']}</code> — {_esc(c['rec_title'])}")
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
        lines.append("\n📅 <b>APPUNTAMENTI</b>")
        for ev in events:
            start = datetime.fromisoformat(ev["rec_event_start"])
            end_str = ""
            if ev.get("rec_event_end"):
                end = datetime.fromisoformat(ev["rec_event_end"])
                end_str = f"→{end.strftime('%H:%M')}"
            prj = _get_prj_label(ev)
            lines.append(
                f"  <code>{start.strftime('%H:%M')}</code>{end_str}  {_esc(ev['rec_title'])}{prj}"
            )
            lines.append(f"  {ev['rec_code']}")

    if tasks:
        lines.append("\n✅ <b>TASK IN SCADENZA OGGI</b>")
        for t in tasks:
            prj = _get_prj_label(t)
            lines.append(f"  <code>{t['rec_code']}</code>  {_esc(t['rec_title'])}{prj}")

    if alerts:
        lines.append("\n⏰ <b>AVVISI ANTICIPATI</b>")
        for a in alerts:
            start = datetime.fromisoformat(a["rec_event_start"])
            days = a.get("days_to_event", "?")
            prj = _get_prj_label(a)
            lines.append(
                f"  [{days}gg] <code>{a['rec_code']}</code>  {_esc(a['rec_title'])}{prj}"
            )
            lines.append(f"  {format_it_datetime(start)}")

    if not events and not tasks and not alerts:
        lines.append("\n🎉 Nessun impegno per oggi!")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return "\n".join(lines)


def week_digest(week_start: "date", week_end: "date", events: list[dict], tasks: list[dict]) -> str:
    from datetime import date, timedelta
    giorni = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
    today = date.today()

    lines = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"📅 SETTIMANA — {week_start.strftime('%d/%m')} → {week_end.strftime('%d/%m/%Y')}",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ]

    if events:
        lines.append(f"\n📅 <b>APPUNTAMENTI ({len(events)})</b>")
        for ev in events:
            start = datetime.fromisoformat(ev["rec_event_start"])
            giorno = giorni[start.weekday()]
            ora_s  = start.strftime("%H:%M")
            ora_e  = ""
            if ev.get("rec_event_end"):
                end = datetime.fromisoformat(ev["rec_event_end"])
                ora_e = f"→{end.strftime('%H:%M')}"
            prj = _get_prj_label(ev)
            lines.append(
                f"  <b>{giorno} {start.strftime('%d/%m')}</b>  "
                f"<code>{ora_s}{ora_e}</code>  {_esc(ev['rec_title'])}{prj}"
            )
            lines.append(f"  <code>{ev['rec_code']}</code>")

    if tasks:
        lines.append(f"\n✅ <b>TASK IN SCADENZA ({len(tasks)})</b>")
        for t in tasks:
            due = t["rec_due_date"]
            due_date = date.fromisoformat(due)
            diff = (due_date - today).days
            if diff < 0:
                label = f"🔴 Scaduto {abs(diff)}gg fa"
            elif diff == 0:
                label = "🟠 Scade oggi"
            elif diff == 1:
                label = "🟡 Scade domani"
            else:
                label = f"📅 {due_date.strftime('%d/%m')}"
            prj = _get_prj_label(t)
            lines.append(
                f"  {label}  <code>{t['rec_code']}</code>  {_esc(t['rec_title'])}{prj}"
            )

    if not events and not tasks:
        lines.append("\n🎉 Nessun impegno in settimana!")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return "\n".join(lines)


def urgent_list(tasks: list[dict]) -> str:
    from datetime import date
    today = date.today()

    if not tasks:
        return (
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "🟢 URGENTI — nessun task\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )

    lines = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"🔴 URGENTI — {len(tasks)} task",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ]

    for t in tasks:
        status_icon = "⏸" if t.get("rec_status") == "sospeso" else "🔴"
        lines.append(f"\n{status_icon} <code>{t['rec_code']}</code>")
        lines.append(f"   {_esc(t['rec_title'])}")
        prj = _get_prj_label(t)
        if prj:
            lines.append(f"   📁{prj}")
        due = t.get("rec_due_date")
        if due:
            due_date = date.fromisoformat(due)
            diff = (due_date - today).days
            if diff < 0:
                lines.append(f"   ⚠️ Scaduto {abs(diff)}gg fa")
            elif diff == 0:
                lines.append("   🔥 Scade oggi")
            elif diff == 1:
                lines.append("   ⏰ Scade domani")
            else:
                lines.append(f"   ⏰ Scade in {diff}gg  ({due_date.strftime('%d/%m/%Y')})")
        else:
            lines.append("   📌 Nessuna scadenza")

    lines.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return "\n".join(lines)


def kind_label(k: str) -> str:
    return {"T": "Task", "M": "Memo", "EV": "Event"}.get(k, k)


def inbox_list(records: list[dict]) -> str:
    if not records:
        return "📥 Inbox vuota"
    lines = ["📥 <b>INBOX</b>\n"]
    for r in records[:10]:
        kind = kind_label(r["rec_kind"])
        lines.append(f"  [{kind}] {_esc(r['rec_title'])}")
        lines.append(f"  <code>{r['rec_id'][:8]}…</code>\n")
    return "\n".join(lines)


# ─── helpers interni ──────────────────────────────────────────────────────────

def _esc(text: str) -> str:
    """Escapa i caratteri speciali HTML per Telegram."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _get_prj_label(record: dict) -> str:
    """Estrae il label del progetto da un record, gestendo sia dict che stringa."""
    prj = record.get("prj_label")
    if not prj:
        return ""
    if isinstance(prj, dict):
        return f" — {_esc(prj.get('prj_label', ''))}"
    return f" — {_esc(str(prj))}"
