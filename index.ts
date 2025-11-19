// index.ts
import "https://deno.land/x/dotenv/load.ts";
import express from "npm:express";
import bodyParser from "npm:body-parser";
import { Bot } from "npm:grammy";

// Load env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const PORT = Number(Deno.env.get("PORT") || 8000);
const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing env variables");
}

// Initialize bot
const bot = new Bot(BOT_TOKEN);

bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Express setup
const app = express();
app.use(bodyParser.json());

app.post(WEBHOOK_URL, async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  try {
    await bot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error");
  }
});

// Simple GET to confirm server is live
app.get(WEBHOOK_URL, (req, res) => {
  res.send("Webhook server is live 🚀");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  // Set webhook (Telegram must be able to reach this URL)
  try {
    await bot.api.setWebhook(WEBHOOK_URL, {
      secret_token: WEBHOOK_SECRET_TOKEN,
    });
    console.log("Webhook set successfully!");
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});
