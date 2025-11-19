/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context, GrammyError, HttpError } from "https://deno.land/x/grammy@v1.41.0/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// === Bot token from environment variable ===
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

// === Bot instance ===
const bot = new Bot<Context>(BOT_TOKEN);

// === Safe deletion helper ===
async function safeDelete(ctx: Context) {
  try {
    if (!ctx.message) {
      console.log("No message to delete:", ctx.chat?.id);
      return;
    }
    await ctx.deleteMessage();
    console.log("Deleted message:", ctx.message.message_id, "in chat", ctx.chat?.id);
  } catch (err: any) {
    if (err instanceof GrammyError || err instanceof HttpError) {
      console.log("Delete failed:", err.message);
    } else {
      console.log("Delete failed (unknown):", String(err));
    }
  }
}

// === Event handlers ===
bot.on("message:new_chat_members", async (ctx: Context) => {
  console.log("New member event:", ctx.message);
  if (ctx.message?.new_chat_members?.length) await safeDelete(ctx);
});

bot.on("message:left_chat_member", async (ctx: Context) => {
  console.log("Left member event:", ctx.message);
  await safeDelete(ctx);
});

bot.command("start", (ctx: Context) => ctx.reply("Bot is running 🔥"));

// === Deno Deploy webhook ===
serve(async (req: Request) => {
  console.log("Request received:", req.method, req.url);

  if (req.method === "POST") {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      console.log("POST body is invalid JSON:", await req.text());
    }

    if (body) {
      try {
        await bot.handleUpdate(body as unknown as Record<string, unknown>);
      } catch (err) {
        console.error("Error handling update:", String(err));
      }
    }

    // Telegram requires 200 OK
    return new Response("ok", { status: 200 });
  }

  // Catch-all GET / other requests to prevent 404
  return new Response("Webhook is live", { status: 200 });
});
