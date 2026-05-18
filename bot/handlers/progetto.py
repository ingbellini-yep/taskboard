"""Handler /progetto — visualizzazione progetto e ricerca."""
from __future__ import annotations

import telegram

from ..config import PROJ_SEARCH
from ..database import search_projects, db
from ..keyboards import search_results_keyboard
from ..session import set_session, get_session, clear_session


async def cmd_progetto(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    text = update.message.text or ""
    # /progetto nomeparziale → ricerca diretta
    parts = text.split(maxsplit=1)
    query = parts[1].strip() if len(parts) > 1 else ""

    if query:
        await _show_search_results(chat_id, query, bot)
    else:
        set_session(chat_id, PROJ_SEARCH, {})
        await bot.send_message(chat_id, "🔍 Inserisci il nome (parziale) del progetto:")


async def on_search_query(update: telegram.Update, bot: telegram.Bot) -> None:
    chat_id = update.effective_chat.id
    query = update.message.text.strip()
    clear_session(chat_id)
    await _show_search_results(chat_id, query, bot)


async def _show_search_results(chat_id: int, query: str, bot: telegram.Bot) -> None:
    projects = search_projects(query)
    if not projects:
        await bot.send_message(chat_id, f"❌ Nessun progetto trovato per «{query}».")
        return
    if len(projects) == 1:
        await _show_project_detail(chat_id, projects[0]["prj_id"], bot)
    else:
        await bot.send_message(
            chat_id,
            f"🔍 Trovati {len(projects)} progetti per «{query}»:",
            reply_markup=search_results_keyboard(projects),
        )


async def show_project_detail(chat_id: int, prj_id: str, bot: telegram.Bot) -> None:
    await _show_project_detail(chat_id, prj_id, bot)


async def _show_project_detail(chat_id: int, prj_id: str, bot: telegram.Bot) -> None:
    prj_r = db().table("tb_projects").select("*").eq("prj_id", prj_id).execute()
    if not prj_r.data:
        await bot.send_message(chat_id, "❌ Progetto non trovato.")
        return
    prj = prj_r.data[0]

    rec_r = (
        db().table("tb_records")
        .select("rec_code, rec_kind, rec_title, rec_status, rec_priority, rec_due_date")
        .eq("rec_prj_id", prj_id)
        .not_.in_("rec_status", ["chiuso", "archiviato"])
        .order("rec_priority")
        .limit(15)
        .execute()
    )
    records = rec_r.data or []

    lines = [
        f"📁 *{prj['prj_code']} — {prj['prj_label']}*",
        f"Stato: {prj['prj_status']} | Priorità: {prj['prj_priority']}",
    ]
    if prj.get("prj_client"):
        lines.append(f"Cliente: {prj['prj_client']}")
    if prj.get("prj_due_date"):
        lines.append(f"Scadenza: {prj['prj_due_date']}")

    if records:
        lines.append(f"\n*Record aperti ({len(records)}):*")
        for r in records:
            kind_sym = {"T": "☐", "M": "📝", "EV": "📅"}.get(r["rec_kind"], "•")
            due = f" ⏰{r['rec_due_date'][:10]}" if r.get("rec_due_date") else ""
            lines.append(f"  {kind_sym} `{r['rec_code']}` {r['rec_title']}{due}")
    else:
        lines.append("\n_Nessun record aperto._")

    await bot.send_message(chat_id, "\n".join(lines), parse_mode="Markdown")
