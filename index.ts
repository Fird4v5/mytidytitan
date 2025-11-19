// index.ts
import "https://deno.land/x/dotenv/load.ts";
import express from "npm:express";
import bodyParser from "npm:body-parser";
import { Bot } from "npm:grammy";

// Load env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const PORT = Number(Deno.env.get("PORT") || 8000);
const DEPLOY_URL = Deno.env.get("DENO_DEPLOYMENT_URL"); // Automatically set by Deno Deploy

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing required env variables: BOT_TOKEN or WEBHOOK_SECRET_TOKEN");
}

if (!DEPLOY_URL) {
  throw new Error("DENO_DEPLOYMENT_URL is not set! Only works on Deno Deploy");
}

const WEBHOOK_URL = `https://${DEPLOY_URL}/webhook`;

// Initialize bot
const bot = new Bot(BOT_TOKEN);

// Delete joined/left messages
bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));

// Start command
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Express setup
const app = express();
app.use(bodyParser.json());

// Webhook route
app.post("/webhook", async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  console.log("Received update:", JSON.stringify(req.body));

  try {
    await bot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error");
  }
});

// Simple GET for testing
app.get("/", (req, res) => {
  res.send("Webhook server is live 🚀");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Setting Telegram webhook to: ${WEBHOOK_URL}`);

  try {
    // Remove any previous webhook just in case
    await bot.api.deleteWebhook();

    // Set webhook for this deployment
    await bot.api.setWebhook(WEBHOOK_URL, {
      secret_token: WEBHOOK_SECRET_TOKEN,
    });
    console.log("Webhook set successfully!");
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});
