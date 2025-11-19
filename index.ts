/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { Bot, Context, GrammyError, HttpError } from "https://deno.land/x/grammy@v1.21.1/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// === Environment ===
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

// === Bot instance ===
const bot = new Bot<Context>(BOT_TOKEN);

// === Helper: format errors safely ===
function formatErr(e: unknown) {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try { return JSON.stringify(e); } catch { return String(e); }
}

// === Safe delete helper ===
async function safeDelete(ctx: Context) {
  try {
    if (!ctx.message) {
      console.log("No message to delete:", ctx.chat?.id);
      return;
    }
    await ctx.deleteMessage();
    console.log("Deleted message:", ctx.message.message_id, "in chat", ctx.chat?.id);
  } catch (err: unknown) {
    if (err instanceof GrammyError || err instanceof HttpError) {
      console.log("Delete failed:", formatErr(err));
    } else {
      console.log("Delete failed (unknown):", formatErr(err));
    }
  }
}

// === Handlers ===

// New chat members
bot.on("message:new_chat_members", async (ctx: Context) => {
  console.log("New member event:", ctx.message);
  if (ctx.message?.new_chat_members?.length) {
    await safeDelete(ctx);
  }
});

// Left member
bot.on("message:left_chat_member", async (ctx: Context) => {
  console.log("Left member event:", ctx.message);
  await safeDelete(ctx);
});

// /start command
bot.command("start", (ctx: Context) => ctx.reply("Bot is running 🔥"));

// === Deno Deploy webhook handler ===
serve(async (req) => {
  console.log("Request received:", req.method, req.url);

  if (req.method === "POST") {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      console.log("POST request with invalid JSON:", await req.text());
    }

    if (body) {
      try {
        await bot.handleUpdate(body as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        console.error("Error handling update:", formatErr(err));
      }
    }
    return new Response("ok");
  }

  // Catch-all GET or other requests (prevents 404)
  return new Response("Webhook OK", { status: 200 });
});
