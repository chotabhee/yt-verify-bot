const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// 🔑 CONFIG
const TOKEN = "YOUR_DISCORD_BOT_TOKEN";
const YT_API_KEY = "YOUR_YOUTUBE_API_KEY";
const VIDEO_ID = "YOUR_VIDEO_ID";
const VERIFIED_ROLE = "Verified";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// memory store
const users = {};

function generateCode() {
  return "PX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// fetch comments with author
async function fetchComments() {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=100&key=${YT_API_KEY}`;
  const res = await axios.get(url);

  return res.data.items.map(i => ({
    text: i.snippet.topLevelComment.snippet.textDisplay,
    author: i.snippet.topLevelComment.snippet.authorDisplayName
  }));
}

// verification logic
async function verifyUser(msg) {
  const data = users[msg.author.id];
  if (!data) return msg.reply("❌ Start with !verify");

  // expiry check
  if (Date.now() > data.expiry) {
    delete users[msg.author.id];
    return msg.reply("⌛ Code expired, run !verify again");
  }

  msg.reply("⏳ Checking comments...");

  const comments = await fetchComments();

  const found = comments.find(c =>
    c.text.includes(data.code) &&
    c.author.toLowerCase().includes(msg.author.username.toLowerCase())
  );

  if (found) {
    const role = msg.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
    const member = msg.guild.members.cache.get(msg.author.id);

    await member.roles.add(role);
    delete users[msg.author.id];

    return msg.reply("✅ VERIFIED 🔓 Access granted");
  }

  msg.reply("❌ Not found. Make sure:\n- Correct code\n- Username visible");
}

client.on("ready", () => {
  console.log("🔥 ADV BOT READY:", client.user.tag);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // START
  if (msg.content === "!verify") {
    const code = generateCode();

    users[msg.author.id] = {
      code,
      expiry: Date.now() + 5 * 60 * 1000 // 5 min
    };

    await msg.author.send(
      `⚡ ADV VERIFICATION\n\n1. Subscribe\n2. Comment this EXACT code:\n\n${code}\n\n⚠️ Username must match\n⏳ Valid for 5 minutes\n\nThen type !done`
    );

    msg.reply("📩 Check DM (code sent)");
  }

  // CHECK
  if (msg.content === "!done") {
    verifyUser(msg);
  }
});

client.login(TOKEN);