const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// 🔑 ENV CONFIG (Railway se aayega)
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

// YouTube comments fetch
async function fetchComments() {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=100&key=${YT_API_KEY}`;
  const res = await axios.get(url);

  return res.data.items.map(i => ({
    text: i.snippet.topLevelComment.snippet.textDisplay,
    author: i.snippet.topLevelComment.snippet.authorDisplayName
  }));
}

// verify logic
async function verifyUser(msg) {
  const data = users[msg.author.id];
  if (!data) return msg.reply("❌ Pehle !verify karo");

  if (Date.now() > data.expiry) {
    delete users[msg.author.id];
    return msg.reply("⌛ Code expire ho gaya, firse !verify karo");
  }

  msg.reply("⏳ Checking YouTube comments...");

  try {
    const comments = await fetchComments();

    const found = comments.find(c =>
      c.text.includes(data.code) &&
      c.author.toLowerCase().includes(msg.author.username.toLowerCase())
    );

    if (found) {
      const role = msg.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
      if (!role) return msg.reply("❌ 'Verified' role nahi mila");

      const member = msg.guild.members.cache.get(msg.author.id);
      await member.roles.add(role);

      delete users[msg.author.id];
      return msg.reply("✅ VERIFIED 🔓 Access mil gaya");
    }

    msg.reply("❌ Code nahi mila. Check karo:\n- Sahi code\n- Username match");
  } catch (err) {
    console.log(err);
    msg.reply("⚠️ Error aaya, thodi der baad try karo");
  }
}

// bot ready
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

    await msg.author.send(
      `⚡ VERIFY SYSTEM\n\n1. YouTube video open karo\n2. Ye code comment karo:\n\n${code}\n\n⏳ 5 min valid\n\nPhir server me !done likho`
    );

    msg.reply("📩 DM check karo");
  }

  if (msg.content === "!done") {
    verifyUser(msg);
  }
});

client.login(TOKEN);  if (msg.content === "!verify") {
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
