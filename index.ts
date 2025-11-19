// index.ts
import "https://deno.land/x/dotenv/load.ts";
import { Bot } from "npm:grammy";

// Load env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing env vars BOT_TOKEN or WEBHOOK_SECRET_TOKEN");
}

// Initialize bot
const bot = new Bot(BOT_TOKEN);

// Handle join/leave messages
bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));

// Start command
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// --- Deno Deploy serverless handler ---
export default async function handler(req: Request): Promise<Response> {
  // Only POST requests from Telegram
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Secret token verification
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretToken !== WEBHOOK_SECRET_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    await bot.handleUpdate(update);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
}

// --- Optional: set webhook automatically ---
// Only call this **once** manually after first deployment
if (import.meta.main) {
  const DEPLOY_URL = Deno.env.get("DENO_DEPLOYMENT_URL");
  if (!DEPLOY_URL) {
    console.warn("DENO_DEPLOYMENT_URL not available. Set webhook manually in Telegram.");
  } else {
    const WEBHOOK_URL = `https://${DEPLOY_URL}`;
    try {
      // Delete old webhook if exists
      await bot.api.deleteWebhook();
      await bot.api.setWebhook(WEBHOOK_URL, { secret_token: WEBHOOK_SECRET_TOKEN });
      console.log("Webhook set successfully:", WEBHOOK_URL);
    } catch (err) {
      console.error("Failed to set webhook:", err);
    }
  }
}
