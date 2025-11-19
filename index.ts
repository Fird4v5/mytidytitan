/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context } from "https://deno.land/x/grammy@v1.38.3/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/dotenv/load.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN || !WEBHOOK_URL) {
  throw new Error("Missing required env variables");
}

const bot = new Bot<Context>(BOT_TOKEN);

bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Deno Deploy serve
serve(async (req: Request) => {
  const url = new URL(req.url);
  if (
    req.method === "POST" &&
    url.pathname === "/webhook" &&
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

  return new Response("Webhook live", { status: 200 });
});
