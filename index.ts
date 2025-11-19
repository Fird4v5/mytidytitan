import "https://deno.land/x/dotenv/load.ts";
import express from "npm:express";
import { Bot } from "npm:grammy";
import bodyParser from "npm:body-parser";

// Load env
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const PORT = Number(Deno.env.get("PORT") || 8000);

// Provided *only* on deploy
const DEPLOY_URL = Deno.env.get("DENO_DEPLOYMENT_URL");

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing env vars BOT_TOKEN or SECRET");
}

if (!DEPLOY_URL) {
  throw new Error("DENO_DEPLOYMENT_URL is not set! Deploy it, don't run it locally.");
}

const bot = new Bot(BOT_TOKEN);

// delete join/leave
bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.command("start", (ctx) => ctx.reply("Bot is alive 🔥"));

// express
const app = express();
app.use(bodyParser.json());

// webhook handler
app.post("/webhook", async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  await bot.handleUpdate(req.body);
  res.send("OK");
});

app.get("/", (_, res) => res.send("Bot server OK"));

app.listen(PORT, async () => {
  const url = `${DEPLOY_URL}/webhook`;

  try {
    await bot.api.setWebhook(url, {
      secret_token: WEBHOOK_SECRET_TOKEN,
    });
    console.log("Webhook set:", url);
  } catch (err) {
    console.error("Error setting webhook:", err);
  }
});
