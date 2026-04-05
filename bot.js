const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const TOKEN = process.env.TOKEN;
const YT_API_KEY = process.env.YT_API_KEY;
const VIDEO_ID = process.env.VIDEO_ID;
const VERIFIED_ROLE = "Verified";
const LOG_CHANNEL_ID = "YAHAN_APNE_LOG_CHANNEL_KI_ID_DALO"; // Naya log channel banakar ID yahan daalein

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// --- ADVANCED SYSTEMS ---
const users = new Map(); // Data store karne ke liye Map (Better performance)
const cooldowns = new Map(); // Anti-Spam system ke liye

// Smart Caching System (YouTube API Limit bachane ke liye)
let ytCache = {
  comments: [],
  lastFetch: 0
};
const CACHE_TIME = 30 * 1000; // 30 seconds tak cache rahega

// Genshin / Gaming style Redeem Code generator
function generateRedeemCode() {
  return "PMN-" + Math.random().toString(36).substring(2, 10).toUpperCase(); // e.g. PMN-X7B9K2A1
}

// --- TRENDING & GAMING DIALOGUES ---
const waitLines = [
  "⏳ Encrypted data scan ho raha hai... YouTube logs check kar raha hoon. 🕵️‍♂️",
  "⏳ System override in progress... tera quest status check ho raha hai! ⚙️",
  "⏳ Hold up boss! Backend mein API se baat chal rahi hai... thoda sabar. 📶"
];

const successLines = [
  "✅ **Quest Completed!** 🔓 Firewall bypass successful. Server mein swagat hai, aag laga do! 🔥",
  "✅ **Level Up!** 🔓 Tera redeem code accept ho gaya hai. System faad diya tune! 🚀",
  "✅ **Access Granted!** 🔓 Verified role mil gaya, ab jaake chat mein OP bolte public! 😎"
];

const failLines = [
  "❌ Mission Failed! Tera comment logs mein nahi mila. Dhyan se subscribe kiya tha na? Wapas `!done` likh! 🤦‍♂️",
  "❌ Error 404: Comment Not Found! Agar abhi comment mara hai toh 1-2 minute ruk ke `!done` try kar. ⏳",
  "❌ Moye Moye! Lagta hai code theek se paste nahi kiya. Wapas jaake check kar aur try again! 😭"
];

function getRandomLine(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- YOUTUBE FETCH FUNCTION (WITH CACHING) ---
async function fetchCommentsSmartly() {
  const now = Date.now();
  
  // Agar last check ko 30 second se kam hua hai, toh purana data hi de do (Save API quota)
  if (now - ytCache.lastFetch < CACHE_TIME) {
    console.log("⚡ Serving from Cache...");
    return ytCache.comments;
  }

  try {
    console.log("🌐 Fetching fresh data from YouTube...");
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=100&key=${YT_API_KEY}`;
    const res = await axios.get(url);

    if (!res.data.items) return [];

    const extractedComments = res.data.items.map(i => ({
      text: i.snippet.topLevelComment.snippet.textDisplay || "",
      author: i.snippet.topLevelComment.snippet.authorDisplayName || ""
    }));

    // Cache update karo
    ytCache.comments = extractedComments;
    ytCache.lastFetch = now;
    
    return extractedComments;
  } catch (err) {
    console.log("❌ YT ERROR:", err.message);
    return ytCache.comments; // Error aane par purana data de do
  }
}

// --- VERIFICATION LOGIC ---
async function verifyUser(msg) {
  if (!msg.guild) return msg.reply("❌ Are hacker bhai, `!done` server mein likhna hai, mere DM mein nahi!");

  const userData = users.get(msg.author.id);
  if (!userData) return msg.reply("❌ Tera koi active quest nahi hai. Pehle `!verify` toh likh!");

  if (Date.now() > userData.expiry) {
    users.delete(msg.author.id);
    return msg.reply("⌛ Code expire ho gaya. Timeout! Wapas `!verify` likh aur naya code generate kar.");
  }

  msg.reply(getRandomLine(waitLines));

  const comments = await fetchCommentsSmartly();
  const found = comments.find(c => c.text.includes(userData.code));

  if (found) {
    const role = msg.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
    if (!role) return msg.reply(`❌ Server mein \`${VERIFIED_ROLE}\` role nahi mila. Admin log kya kar rahe hain?`);

    try {
      const member = await msg.guild.members.fetch(msg.author.id);
      await member.roles.add(role);
      users.delete(msg.author.id); 

      // Send Success Message
      msg.reply(getRandomLine(successLines));

      // --- AUDIT LOGGING ---
      const logChannel = msg.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("🔐 New Verification Alert")
          .setDescription(`**User:** <@${msg.author.id}> (${msg.author.tag})\n**Code Used:** \`${userData.code}\`\n**YouTube Name:** ${found.author}`)
          .setTimestamp();
        logChannel.send({ embeds: [logEmbed] });
      }

    } catch (error) {
      console.log("Role add error:", error);
      return msg.reply("❌ Role add karne mein glitch aa gaya. Bot permissions check karo.");
    }
  } else {
    msg.reply(getRandomLine(failLines));
  }
}

client.on("ready", () => {
  console.log(`🟢 SYSTEM ONLINE: All sub-routines active for ${client.user.tag}`);
});

client.on("guildMemberAdd", async (member) => {
  try {
    await member.send(`Welcome to the Guild! 🎮\nServer unlock karne ke liye verification channel mein jao aur \`!verify\` type karo.`);
  } catch (err) {
    console.log(`Failed to DM ${member.user.tag}`);
  }
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!verify") {
    if (!msg.guild) return msg.reply("❌ Ye command server mein use karo.");

    // Anti-Spam: Cooldown Check (1 minute per user)
    const lastUsed = cooldowns.get(msg.author.id);
    if (lastUsed && Date.now() - lastUsed < 60000) {
      const timeLeft = Math.ceil((60000 - (Date.now() - lastUsed)) / 1000);
      return msg.reply(`⚠️ Spam mat kar bhai! Agla code lene ke liye ${timeLeft} seconds wait kar.`);
    }

    const code = generateRedeemCode();
    
    users.set(msg.author.id, {
      code,
      expiry: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    });
    
    cooldowns.set(msg.author.id, Date.now()); // Cooldown chalu

    try {
      // Modern Embed format for DM
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("🔑 PaimonHindi Verification Quest")
        .setDescription(
          `**Tera Exclusive Code:** \`${code}\`\n\n` +
          `**📜 Mission Steps:**\n` +
          `1️⃣ **Video link open kar:** [Click Here](https://youtu.be/${VIDEO_ID})\n` +
          `2️⃣ **Subscribe** kar PaimonHindi channel ko.\n` +
          `3️⃣ Comments mein apna code paste kar de.\n` +
          `4️⃣ Server mein wapas aakar \`!done\` type kar!`
        )
        .setFooter({ text: "Valid for 5 minutes only! Hurry up!" });

      await msg.author.send({ embeds: [embed] });
      msg.reply("📩 Maine tere DM mein secret quest bhej diya hai. Check kar! 👀");
    } catch (err) {
      msg.reply("❌ Tera DM locked hai boss! Privacy settings mein jaake server members se direct messages allow kar.");
    }
  }

  if (msg.content === "!done") {
    verifyUser(msg);
  }
});

client.login(TOKEN);
