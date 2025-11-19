// index.ts
/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import {
  Bot,
  Context,
  GrammyError,
  HttpError,
} from "https://deno.land/x/grammy@v1.21.1/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

// bot
const bot = new Bot<Context>(BOT_TOKEN);

// helper: type-safe error handling
function formatErr(e: unknown) {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// safe deletion
async function safeDelete(ctx: Context) {
  try {
    await ctx.deleteMessage();
  } catch (err: unknown) {
    // handle specific grammY/http errors if available, otherwise generic
    if (err instanceof GrammyError || err instanceof HttpError) {
      console.log("Delete failed:", formatErr(err));
    } else {
      console.log("Delete failed (unknown):", formatErr(err));
    }
  }
}

// new members (possibly multiple)
bot.on("message:new_chat_members", async (ctx: Context) => {
  // ctx.message is typed, so no any-ish usage
  if (ctx.message?.new_chat_members?.length) {
    await safeDelete(ctx);
  }
});

// left member
bot.on("message:left_chat_member", async (ctx: Context) => {
  await safeDelete(ctx);
});

// start command
bot.command("start", (ctx: Context) => ctx.reply("Bot is running 🔥"));

// webhook handler
serve(async (req) => {
  if (req.method === "POST") {
    try {
      // parse safely, then forward to grammY
      const body = await req.json().catch(() => null);
      if (body) await bot.handleUpdate(body as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      console.error("Error handling update:", formatErr(err));
    }
    return new Response("ok");
  }
  return new Response("Webhook OK", { status: 200 });
});
