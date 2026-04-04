const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// ENV
const TOKEN = process.env.TOKEN;
const YT_API_KEY = process.env.YT_API_KEY;
const VIDEO_ID = process.env.VIDEO_ID;
const VERIFIED_ROLE = "Verified";

// client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// memory
const users = {};

// code generator
function generateCode() {
  return "PX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// fetch comments
async function fetchComments() {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=100&key=${YT_API_KEY}`;
  const res = await axios.get(url);

  return res.data.items.map(i => ({
    text: i.snippet.topLevelComment.snippet.textDisplay,
    author: i.snippet.topLevelComment.snippet.authorDisplayName
  }));
}

// verify
async function verifyUser(msg) {
  const data = users[msg.author.id];
  if (!data) return msg.reply("❌ Pehle !verify karo");

  if (Date.now() > data.expiry) {
    delete users[msg.author.id];
    return msg.reply("⌛ Code expire ho gaya");
  }

  msg.reply("⏳ Checking...");

  try {
    const comments = await fetchComments();

    const found = comments.find(c =>
      c.text.includes(data.code) &&
      c.author.toLowerCase().includes(msg.author.username.toLowerCase())
    );

    if (found) {
      const role = msg.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
      if (!role) return msg.reply("❌ Role nahi mila");

      const member = msg.guild.members.cache.get(msg.author.id);
      await member.roles.add(role);

      delete users[msg.author.id];
      return msg.reply("✅ VERIFIED");
    }

    msg.reply("❌ Code nahi mila");
  } catch (err) {
    console.log(err);
    msg.reply("⚠️ Error");
  }
}

// ready
client.on("ready", () => {
  console.log("🔥 BOT ONLINE:", client.user.tag);
});

// commands
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!verify") {
    const code = generateCode();

    users[msg.author.id] = {
      code,
      expiry: Date.now() + 5 * 60 * 1000
    };

    await msg.author.send(`Code: ${code}\nComment karo YouTube pe\nPhir !done`);
    msg.reply("📩 DM check karo");
  }

  if (msg.content === "!done") {
    verifyUser(msg);
  }
});

// login
client.login(TOKEN);
