import "https://deno.land/x/dotenv/load.ts";
import express from "npm:express";
import bodyParser from "npm:body-parser";
import { Bot } from "npm:grammy";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN");
const PORT = Number(Deno.env.get("PORT") || 8000);

if (!BOT_TOKEN || !WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing env vars BOT_TOKEN or SECRET");
}

const bot = new Bot(BOT_TOKEN);
bot.on("message:new_chat_members", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.on("message:left_chat_member", (ctx) => ctx.deleteMessage().catch(() => {}));
bot.command("start", (ctx) => ctx.reply("Bot is running 🔥"));

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET_TOKEN) {
    return res.status(401).send("Unauthorized");
  }
  await bot.handleUpdate(req.body);
  res.send("OK");
});

app.get("/", (_, res) => res.send("Server live 🚀"));

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  
  // Only now at runtime on Deno Deploy the env exists
  const DEPLOY_URL = Deno.env.get("DENO_DEPLOYMENT_URL");
  if (!DEPLOY_URL) {
    console.warn("DEPLOY_URL not set yet; webhook not configured automatically.");
    return;
  }

  const WEBHOOK_URL = `https://${DEPLOY_URL}/webhook`;
  try {
    await bot.api.deleteWebhook(); // remove old
    await bot.api.setWebhook(WEBHOOK_URL, { secret_token: WEBHOOK_SECRET_TOKEN });
    console.log("Webhook set successfully:", WEBHOOK_URL);
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});
