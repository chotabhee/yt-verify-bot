const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const TOKEN = process.env.TOKEN;
const YT_API_KEY = process.env.YT_API_KEY;
const VIDEO_ID = process.env.VIDEO_ID;
const VERIFIED_ROLE = "Verified";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const users = {};

function generateCode() {
  return "PX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function fetchComments() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=100&key=${YT_API_KEY}`;
    const res = await axios.get(url);

    if (!res.data.items) return [];

    return res.data.items.map(i => ({
      text: i.snippet.topLevelComment.snippet.textDisplay || "",
      author: i.snippet.topLevelComment.snippet.authorDisplayName || ""
    }));
  } catch (err) {
    console.log("YT ERROR:", err.message);
    return [];
  }
}

async function verifyUser(msg) {
  const data = users[msg.author.id];
  if (!data) return msg.reply("❌ Pehle !verify karo");

  if (Date.now() > data.expiry) {
    delete users[msg.author.id];
    return msg.reply("⌛ Code expire ho gaya");
  }

  msg.reply("⏳ Checking...");

  const comments = await fetchComments();

  const found = comments.find(c =>
    c.text.includes(data.code)
  );

  if (found) {
    const role = msg.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
    if (!role) return msg.reply("❌ Role nahi mila");

    const member = msg.guild.members.cache.get(msg.author.id);
    await member.roles.add(role);

    delete users[msg.author.id];
    return msg.reply("✅ VERIFIED 🔓");
  }

  msg.reply("❌ Code nahi mila");
}

client.on("ready", () => {
  console.log("🔥 BOT ONLINE:", client.user.tag);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!verify") {
    const code = generateCode();

    users[msg.author.id] = {
      code,
      expiry: Date.now() + 5 * 60 * 1000
    };

    await msg.author.send(
      `Code: ${code}\nYouTube pe comment karo\nPhir !done likho`
    );

    msg.reply("📩 DM check karo");
  }

  if (msg.content === "!done") {
    verifyUser(msg);
  }
});

client.login(TOKEN);
