"""Parser per date/ore e durate in italiano."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone

_IT_DAYS = {
    "lunedì": 0, "lunedi": 0,
    "martedì": 1, "martedi": 1,
    "mercoledì": 2, "mercoledi": 2,
    "giovedì": 3, "giovedi": 3,
    "venerdì": 4, "venerdi": 4,
    "sabato": 5,
    "domenica": 6,
}

_IT_MONTHS = {
    "gennaio": 1, "gen": 1,
    "febbraio": 2, "feb": 2,
    "marzo": 3, "mar": 3,
    "aprile": 4, "apr": 4,
    "maggio": 5, "mag": 5,
    "giugno": 6, "giu": 6,
    "luglio": 7, "lug": 7,
    "agosto": 8, "ago": 8,
    "settembre": 9, "set": 9,
    "ottobre": 10, "ott": 10,
    "novembre": 11, "nov": 11,
    "dicembre": 12, "dic": 12,
}


def parse_datetime(text: str) -> datetime | None:
    """
    Parsa espressioni italiane come:
    - "domani", "oggi", "dopodomani"
    - "lunedì", "martedì", ...
    - "25/05", "25/05/2026"
    - "25/05 ore 10", "25/05 ore 10:30"
    - "25 maggio ore 10"
    - "nessuna", "non so" → None
    Restituisce datetime in UTC o None se non parsabile.
    """
    t = text.strip().lower()

    if t in ("nessuna", "nessuno", "non so", "boh", "senza", "senza data"):
        return None

    now = datetime.now(timezone.utc)
    today = now.date()
    result_date: date | None = None
    result_time: tuple[int, int] | None = None

    # Parole chiave data
    if "dopodomani" in t:
        result_date = today + timedelta(days=2)
    elif "domani" in t:
        result_date = today + timedelta(days=1)
    elif t.startswith("oggi"):
        result_date = today

    # Giorno della settimana
    if result_date is None:
        for name, wd in _IT_DAYS.items():
            if name in t:
                days_ahead = (wd - today.weekday()) % 7 or 7
                result_date = today + timedelta(days=days_ahead)
                break

    # Pattern dd/mm o dd/mm/yyyy
    if result_date is None:
        m = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{4}))?", t)
        if m:
            day, month = int(m.group(1)), int(m.group(2))
            year = int(m.group(3)) if m.group(3) else today.year
            try:
                result_date = date(year, month, day)
                if result_date < today:
                    result_date = date(year + 1, month, day)
            except ValueError:
                pass

    # Pattern "25 maggio"
    if result_date is None:
        for name, month_n in _IT_MONTHS.items():
            m = re.search(rf"(\d{{1,2}})\s+{name}", t)
            if m:
                day = int(m.group(1))
                year = today.year
                try:
                    result_date = date(year, month_n, day)
                    if result_date < today:
                        result_date = date(year + 1, month_n, day)
                except ValueError:
                    pass
                break

    if result_date is None:
        return None

    # Orario: "ore 10", "ore 10:30", "alle 10", "10:30", "10h"
    m = re.search(r"(?:ore|alle)?\s*(\d{1,2})[:h](\d{2})?", t)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2)) if m.group(2) else 0
        result_time = (hh, mm)

    if result_time:
        dt = datetime(result_date.year, result_date.month, result_date.day,
                      result_time[0], result_time[1], tzinfo=timezone.utc)
    else:
        # Senza orario: mezzanotte UTC (verrà trattato come "tutto il giorno")
        dt = datetime(result_date.year, result_date.month, result_date.day, 0, 0, tzinfo=timezone.utc)

    return dt


def has_time(text: str) -> bool:
    """True se il testo contiene un orario specifico."""
    t = text.strip().lower()
    return bool(re.search(r"(?:ore|alle)?\s*\d{1,2}[:h]\d{0,2}", t))


def parse_duration_minutes(text: str) -> int | None:
    """
    Parsa durate come "1h30", "30min", "2 ore", "1 ora 30", "non so" → None.
    Ritorna minuti totali o None.
    """
    t = text.strip().lower()
    if t in ("non so", "boh", "?", "senza fine", "senza"):
        return None

    total = 0

    # Pattern "1h30" o "1h 30m"
    m = re.search(r"(\d+)\s*h\s*(\d+)?", t)
    if m:
        total += int(m.group(1)) * 60
        if m.group(2):
            total += int(m.group(2))
        return total or None

    # Pattern "Xmin" o "X minuti"
    m = re.search(r"(\d+)\s*(?:min|minuti?)", t)
    if m:
        return int(m.group(1))

    # Pattern "X ore"
    m = re.search(r"(\d+)\s*(?:ore|ora)", t)
    if m:
        return int(m.group(1)) * 60

    # Solo numero → assumiamo minuti
    m = re.match(r"^(\d+)$", t)
    if m:
        return int(m.group(1))

    return None


def format_it_date(dt: datetime) -> str:
    """Formatta datetime in italiano."""
    giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
    return f"{giorni[dt.weekday()]} {dt.strftime('%d/%m/%Y')}"


def format_it_datetime(dt: datetime) -> str:
    return f"{format_it_date(dt)} ore {dt.strftime('%H:%M')}"
