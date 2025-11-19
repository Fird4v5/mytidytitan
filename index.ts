/**
 * bot.ts
 * Telegram group cleanup bot for Deno Deploy.
 *
 * Behavior:
 *  - Deletes ONLY join/added/left/removed service messages.
 *  
 * Environment Variables (Deno Deploy):
 *  - BOT_TOKEN               = Telegram bot token
 *  - WEBHOOK_SECRET_TOKEN    = secret webhook path segment
 *
 * Webhook URL example:
 *  https://your-app.deno.dev/<WEBHOOK_SECRET_TOKEN>
 */

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET_TOKEN");

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing in environment variables.");
}

if (!WEBHOOK_SECRET) {
  console.error("WEBHOOK_SECRET_TOKEN is missing in environment variables.");
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram API wrapper
async function telegramApi(method: string, body: unknown) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Telegram API error (${method}):`, await res.text());
  }

  return res.json().catch(() => ({}));
}

// Delete service messages
async function deleteMessage(chatId: number, messageId: number) {
  try {
    await telegramApi("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
    console.log(`Deleted service message ${messageId} from ${chatId}`);
  } catch (err) {
    console.error("deleteMessage error:", err);
  }
}

// Check if the Telegram message is a join/leave event
function isJoinOrLeave(msg: any): boolean {
  return (
    msg.new_chat_members ||
    msg.left_chat_member ||
    msg.group_chat_created ||
    msg.supergroup_chat_created ||
    msg.migrate_to_chat_id ||
    msg.migrate_from_chat_id
  );
}

// Handle Telegram updates
async function handleUpdate(update: any) {
  if (!update.message) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  // ONLY delete join/leave events
  if (isJoinOrLeave(msg)) {
    await deleteMessage(chatId, messageId);
  }
}

// HTTP server for webhook
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, "");

  // Secure webhook path
  if (path !== WEBHOOK_SECRET) {
    return new Response("Not found", { status: 404 });
  }

  if (req.method !== "POST") {
    return new Response("OK");
  }

  if (!BOT_TOKEN) {
    return new Response("Server misconfigured (missing BOT_TOKEN)", { status: 500 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  handleUpdate(update).catch((e) => console.error("Update handler error:", e));

  return new Response("OK");
});
