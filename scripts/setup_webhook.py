"""
Registra il webhook Telegram e verifica la configurazione.
Uso: python scripts/setup_webhook.py <VERCEL_URL>

Es.: python scripts/setup_webhook.py https://taskboard-xyz.vercel.app
"""
from __future__ import annotations

import asyncio
import os
import sys

import telegram


async def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python scripts/setup_webhook.py <VERCEL_URL>")
        sys.exit(1)

    base_url = sys.argv[1].rstrip("/")
    webhook_url = f"{base_url}/api/webhook"

    token   = os.environ["TELEGRAM_BOT_TOKEN"]
    secret  = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")

    bot = telegram.Bot(token=token)

    print(f"Registro webhook: {webhook_url}")
    await bot.set_webhook(
        url=webhook_url,
        secret_token=secret or None,
        allowed_updates=["message", "callback_query"],
        drop_pending_updates=True,
    )

    info = await bot.get_webhook_info()
    print(f"✅ Webhook attivo: {info.url}")
    print(f"   Pending updates: {info.pending_update_count}")
    if info.last_error_message:
        print(f"   ⚠️  Ultimo errore: {info.last_error_message}")

    me = await bot.get_me()
    print(f"   Bot: @{me.username} ({me.first_name})")


if __name__ == "__main__":
    asyncio.run(main())
