// index.ts
import "https://deno.land/x/dotenv/load.ts";
import express from "npm:express";
import bodyParser from "npm:body-parser";
import { Bot } from "npm:grammy";

// Load env variables
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const PORT = Number(Deno.env.get("PORT") || 8000);

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing env vars BOT_TOKEN or WEBHOOK_SECRET_TOKEN");
}

// Initialize the bot
const bot = new Bot(BOT_TOKEN);

// Handle join/leave messages
bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));

// Start command
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

// Express server
const app = express();
app.use(bodyParser.json());

// Webhook endpoint
app.post("/webhook", async (req, res) => {
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
app.get("/", (_, res) => res.send("Server live 🚀"));

// Start server and set webhook only **after deployment URL is available**
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  const DEPLOY_URL = Deno.env.get("DENO_DEPLOYMENT_URL");
  if (!DEPLOY_URL) {
    console.warn(
      "DENO_DEPLOYMENT_URL not available yet. Webhook will need to be set manually after deployment."
    );
    return;
  }

  const WEBHOOK_URL = `https://${DEPLOY_URL}/webhook`;

  try {
    // Remove old webhook if exists
    await bot.api.deleteWebhook();
    
    // Set webhook with secret token
    await bot.api.setWebhook(WEBHOOK_URL, {
      secret_token: WEBHOOK_SECRET_TOKEN,
    });
    console.log("Webhook set successfully:", WEBHOOK_URL);
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});
