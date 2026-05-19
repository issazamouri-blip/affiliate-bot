const { Client, GatewayIntentBits, Events } = require('discord.js');

// =============================================
//  CONFIG
// =============================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AMAZON_TAG = 'turbo018-21';
const IG_TAG = 'Turboo'; // Ton tag Instant Gaming
// =============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const AMAZON_REGEX = /https?:\/\/(www\.)?(amazon\.(fr|com|co\.uk|de|it|es|ca|com\.br|com\.mx|co\.jp|com\.au|nl|se|pl|com\.tr)|amzn\.(to|eu))(\/[^\s]*)?/gi;
const IG_REGEX = /https?:\/\/(www\.)?instant-gaming\.com(\/[^\s]*)?/gi;

function extractASIN(url) {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /[?&]ASIN=([A-Z0-9]{10})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getAmazonDomain(url) {
  const match = url.match(/amazon\.(fr|com|co\.uk|de|it|es|ca|com\.br|com\.mx|co\.jp|com\.au|nl|se|pl|com\.tr)/i);
  return match ? `amazon.${match[1]}` : 'amazon.fr';
}

function toAmazonAffiliateUrl(rawUrl) {
  const asin = extractASIN(rawUrl);
  const domain = getAmazonDomain(rawUrl);
  if (asin) {
    return `https://www.${domain}/dp/${asin}?tag=${AMAZON_TAG}`;
  }
  try {
    const urlObj = new URL(rawUrl);
    urlObj.searchParams.set('tag', AMAZON_TAG);
    return urlObj.toString();
  } catch {
    return null;
  }
}

function toIGAffiliateUrl(rawUrl) {
  try {
    const urlObj = new URL(rawUrl);
    urlObj.searchParams.set('igr', IG_TAG);
    return urlObj.toString();
  } catch {
    return null;
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content;
  const affiliateLinks = [];

  const amazonMatches = content.match(AMAZON_REGEX);
  if (amazonMatches) {
    for (const match of amazonMatches) {
      const url = toAmazonAffiliateUrl(match);
      if (url) affiliateLinks.push({ label: '🛒 Amazon', url });
    }
  }

  const igMatches = content.match(IG_REGEX);
  if (igMatches) {
    for (const match of igMatches) {
      const url = toIGAffiliateUrl(match);
      if (url) affiliateLinks.push({ label: '🎮 Instant Gaming', url });
    }
  }

  if (affiliateLinks.length === 0) return;

  const replyMsg = affiliateLinks
    .map(({ label, url }) => `${label} : ${url}`)
    .join('\n');

  try {
    await message.reply({
      content: replyMsg,
      allowedMentions: { repliedUser: false },
    });
  } catch (err) {
    console.error('Erreur envoi message :', err);
  }
});

client.login(DISCORD_TOKEN);
