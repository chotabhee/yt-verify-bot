const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// ENV से आएगा (Railway)
const TOKEN = process.env.TOKEN;
const YT_API_KEY = process.env.YT_API_KEY;
const VIDEO_ID = process.env.VIDEO_ID;
const VERIFIED_ROLE = "Verified";
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
