import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from "discord.js";

console.log(
  "ENV check → has DISCORD_TOKEN:",
  typeof process.env.DISCORD_TOKEN === "string",
  "len:",
  (process.env.DISCORD_TOKEN || "").length
);

const TOKEN = process.env.DISCORD_TOKEN;
const THRESHOLD = Number(process.env.THRESHOLD || 300);
const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_SECONDS || 60);

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN in environment");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

function extractDollarAmounts(text) {
  const results = [];
  const moneyRegex = /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]*\.[0-9]+|[0-9]+)\s*([kKmM])?/g;
  let m;
  while ((m = moneyRegex.exec(text)) !== null) {
    let num = m[1].replace(/,/g, "");
    let val = parseFloat(num);
    const suffix = m[2]?.toLowerCase();
    if (suffix === "k") val *= 1_000;
    else if (suffix === "m") val *= 1_000_000;
    if (!Number.isNaN(val)) results.push(val);
  }
  return results;
}

const lastAlertAt = new Map();
function canAlert(channelId) {
  const now = Date.now();
  const last = lastAlertAt.get(channelId) || 0;
  if (now - last >= COOLDOWN_SECONDS * 1000) {
    lastAlertAt.set(channelId, now);
    return true;
  }
  return false;
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}. Threshold: $${THRESHOLD}`);
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  const amounts = extractDollarAmounts(message.content);
  if (amounts.length === 0) return;
  const maxAmount = Math.max(...amounts);
  if (maxAmount <= THRESHOLD) return;
  if (!canAlert(message.channel.id)) return;
  await message.channel.send("lets nerf that in balance concil !");
});

client.login(TOKEN);

process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));
