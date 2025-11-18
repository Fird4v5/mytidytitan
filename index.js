import { Bot } from "https://deno.land/x/grammy@v1.38.3/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");
const bot = new Bot(BOT_TOKEN);

bot.on("message:new_chat_members", async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_){}
});

bot.on("message:left_chat_member", async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_){}
});

bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

serve(async (req) => {
  if (req.method === "POST") {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response("ok");
  }
  return new Response("Hello from Telegram bot endpoint!", { status: 200 });
});
console.log("Bot is running...");