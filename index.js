import { Bot } from "https://deno.land/x/grammy/mod.js";
import { serve } from "https://deno.land/std@0.203.0/http/server.js";

// Telegram bot token
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

// create bot
const bot = new Bot(BOT_TOKEN);

// Delete "user joined" messages
bot.on("message:new_chat_members", async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
});

// Delete "user left" messages
bot.on("message:left_chat_member", async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
});

// Optional: confirm bot is alive
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Deno Deploy webhook handler
serve(async (req) => {
  if (req.method === "POST") {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response("ok");
  }
  return new Response("Telegram bot webhook endpoint", { status: 200 });
});
