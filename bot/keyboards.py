"""Costruttori di tastiere inline Telegram."""
from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from .database import get_recent_projects


def project_keyboard(include_inbox: bool = True, include_small: bool = False) -> InlineKeyboardMarkup:
    """Tastiera con 5 progetti recenti + opzioni speciali."""
    projects = get_recent_projects(5)
    rows: list[list[InlineKeyboardButton]] = []

    for p in projects:
        label = f"{p['prj_code']} — {p['prj_label']}"[:40]
        rows.append([InlineKeyboardButton(label, callback_data=f"sel_prj:{p['prj_id']}")])

    specials: list[InlineKeyboardButton] = [
        InlineKeyboardButton("🔍 Cerca progetto", callback_data="search_prj"),
    ]
    if include_inbox:
        specials.append(InlineKeyboardButton("📥 Inbox", callback_data="bucket:inbox"))
    if include_small:
        specials.append(InlineKeyboardButton("⚡ Small Tasks", callback_data="bucket:small"))

    rows.append(specials)
    return InlineKeyboardMarkup(rows)


def alert_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("1 giorno",  callback_data="alert:1"),
            InlineKeyboardButton("2 giorni",  callback_data="alert:2"),
            InlineKeyboardButton("3 giorni",  callback_data="alert:3"),
        ],
        [
            InlineKeyboardButton("Personalizzato", callback_data="alert:custom"),
            InlineKeyboardButton("Nessuno",         callback_data="alert:0"),
        ],
    ])


def conflict_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Salva comunque", callback_data="ev_conflict:ok"),
        InlineKeyboardButton("❌ Annulla",         callback_data="ev_conflict:cancel"),
    ]])


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Conferma", callback_data="memo_confirm"),
        InlineKeyboardButton("❌ Annulla",  callback_data="memo_cancel"),
    ]])


def search_results_keyboard(projects: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for p in projects:
        label = f"{p['prj_code']} — {p['prj_label']}"[:40]
        rows.append([InlineKeyboardButton(label, callback_data=f"sel_prj:{p['prj_id']}")])
    rows.append([InlineKeyboardButton("❌ Annulla", callback_data="cancel")])
    return InlineKeyboardMarkup(rows)
