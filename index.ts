/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context } from "https://deno.land/x/grammy@v1.21.1/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// Bot token from Deno Deploy env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

// Create bot
const bot = new Bot<Context>(BOT_TOKEN);

// Minimal join/leave deletion
bot.on("message:new_chat_members", async (ctx: Context) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", async (ctx: Context) => ctx.deleteMessage().catch(() => {}));

bot.command("start", (ctx: Context) => ctx.reply("Bot is running 🔥"));

// Fallback: respond to **any** request to avoid 404
serve(async (req: Request) => {
  if (req.method === "POST") {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      console.log("Invalid POST body:", await req.text());
    }
    if (body) {
      await bot.handleUpdate(body as unknown as Record<string, unknown>).catch(console.error);
    }
    return new Response("ok", { status: 200 });
  }

  // Catch-all for GET/other requests — prevents 404
  return new Response("Webhook live", { status: 200 });
});
