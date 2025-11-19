/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context } from "https://deno.land/x/grammy@v1.38.3/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/dotenv/load.ts"; // loads .env automatically

// Load environment variables
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");
if (!WEBHOOK_SECRET_TOKEN) throw new Error("WEBHOOK_SECRET_TOKEN is not set");
if (!WEBHOOK_URL) throw new Error("WEBHOOK_URL is not set");

// Initialize bot
const bot = new Bot<Context>(BOT_TOKEN);

// Minimal join/leave deletion
bot.on("message:new_chat_members", async (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", async (ctx) => ctx.deleteMessage().catch(() => {}));

// Start command
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Set the webhook (Deno Deploy production)
await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`, { secret_token: WEBHOOK_SECRET_TOKEN });

// Serve requests
serve(async (req: Request) => {
  // Telegram will POST updates here
  if (
    req.method === "POST" &&
    req.url.includes("/webhook") &&
    req.headers.get("X-Telegram-Bot-Api-Secret-Token") === WEBHOOK_SECRET_TOKEN
  ) {
    try {
      const update = await req.json();
      await bot.handleUpdate(update);
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Webhook Error:", err);
      return new Response("Error processing update", { status: 500 });
    }
  }

  // Any other request: respond with a catch-all
  return new Response("Webhook live", { status: 200 });
});
