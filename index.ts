/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context } from "https://deno.land/x/grammy@v1.38.3/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/dotenv/load.ts"; // loads .env automatically

// ENV variables
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN") || "default_secret";
const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL"); // your Deno Deploy URL, e.g., https://mytidytitan.deno.dev
const IN_DEV_MODE = !WEBHOOK_URL; // no webhook URL = local dev

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

const bot = new Bot<Context>(BOT_TOKEN);

// Minimal join/leave deletion
bot.on("message:new_chat_members", async (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", async (ctx) => ctx.deleteMessage().catch(() => {}));

bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Local development: long polling
if (IN_DEV_MODE) {
  console.log("Running in DEV mode: long polling...");
  bot.start();
} else {
  // Production: webhook
  console.log("Running in PRODUCTION mode: webhook enabled");

  // Set webhook
  await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`, {
    secret_token: WEBHOOK_SECRET_TOKEN,
  });

  // Deno HTTP server
  serve(async (req: Request) => {
    if (
      req.method === "POST" &&
      req.url.endsWith("/webhook") &&
      req.headers.get("X-Telegram-Bot-Api-Secret-Token") === WEBHOOK_SECRET_TOKEN
    ) {
      try {
        const update = await req.json();
        await bot.handleUpdate(update as Record<string, unknown>);
        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error("Webhook error:", err);
        return new Response("Error processing update", { status: 500 });
      }
    }

    // Catch-all for GET/other requests — prevents 404
    return new Response("Webhook live", { status: 200 });
  });
}
