const { Client, GatewayIntentBits, Events } = require('discord.js');

// =============================================
//  CONFIG — modifie uniquement cette section
// =============================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AFFILIATE_TAG = 'turbo018-21'; // Ton tag affilié Amazon (ex: monsite-21)
const REPLY_MODE = 'reply'; // 'reply' = répond au message | 'edit' = non supporté par Discord pour les autres
// =============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Regex pour détecter les URLs Amazon (toutes variantes)
const AMAZON_REGEX = /https?:\/\/(www\.)?(amazon\.(fr|com|co\.uk|de|it|es|ca|com\.br|com\.mx|co\.jp|com\.au|nl|se|pl|com\.tr)|amzn\.(to|eu))(\/[^\s]*)?/gi;

// Regex pour extraire l'ASIN d'une URL Amazon
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

// Détermine le domaine Amazon depuis l'URL originale
function getAmazonDomain(url) {
  const match = url.match(/amazon\.(fr|com|co\.uk|de|it|es|ca|com\.br|com\.mx|co\.jp|com\.au|nl|se|pl|com\.tr)/i);
  return match ? `amazon.${match[1]}` : 'amazon.fr';
}

// Transforme une URL Amazon en lien affilié propre
function toAffiliateUrl(rawUrl) {
  const asin = extractASIN(rawUrl);
  const domain = getAmazonDomain(rawUrl);

  if (asin) {
    // Lien propre avec ASIN
    return `https://www.${domain}/dp/${asin}?tag=${AFFILIATE_TAG}`;
  }

  // Pas d'ASIN trouvé (ex: amzn.to) → on ajoute juste le tag à l'URL
  try {
    const urlObj = new URL(rawUrl);
    urlObj.searchParams.set('tag', AFFILIATE_TAG);
    return urlObj.toString();
  } catch {
    return null;
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore les messages du bot lui-même
  if (message.author.bot) return;

  const content = message.content;
  const matches = content.match(AMAZON_REGEX);
  if (!matches) return;

  const affiliateLinks = [];

  for (const match of matches) {
    const affiliateUrl = toAffiliateUrl(match);
    if (affiliateUrl && affiliateUrl !== match) {
      affiliateLinks.push(affiliateUrl);
    }
  }

  if (affiliateLinks.length === 0) return;

  // Construit la réponse
  const linkList = affiliateLinks.map((link, i) =>
    affiliateLinks.length > 1 ? `**Lien ${i + 1} :** ${link}` : link
  ).join('\n');

  const replyMsg = affiliateLinks.length === 1
    ? `🛒 Lien affilié : ${linkList}`
    : `🛒 Liens affiliés :\n${linkList}`;

  try {
    await message.reply({
      content: replyMsg,
      allowedMentions: { repliedUser: false }, // Pas de ping
    });
  } catch (err) {
    console.error('Erreur envoi message :', err);
  }
});

client.login(DISCORD_TOKEN);
