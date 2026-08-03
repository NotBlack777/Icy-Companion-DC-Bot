require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  ActivityType
} = require('discord.js');

const loadCommands = require('./src/handlers/loadCommands');
const interactionCreate = require('./src/handlers/interactionCreate');
const messageCreate = require('./src/handlers/messageCreate');
const dmEvents = require('./src/handlers/dmEvents');

const dm = require('./src/dm');
const dmSlash = require('./src/dm/slash');
const store = require('./src/utils/globalStore');
const { syncConfigNumbers, getConfigNumber } = require('./src/utils/serverResolver');
const ui = require('./src/dm/ui');

/* ---------------- ENV ---------------- */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
// Keep owner DM commands mention-only by default so they do not clutter the
// public slash-command list. Set ENABLE_DM_SLASH_COMMANDS=true on a private
// control-bot deployment if slash access is wanted there instead.
const ENABLE_DM_SLASH_COMMANDS = /^(1|true|yes|on)$/i.test(
  process.env.ENABLE_DM_SLASH_COMMANDS || ''
);

if (!TOKEN) {
  console.log('❌ TOKEN missing');
  process.exit(1);
}

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildMessageReactions
  ],

  // Required to receive DM events for uncached channels/messages,
  // including reactions on messages the bot has not seen this session.
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.User
  ]
});

client.commands = new Collection();

/* ---------------- COMMAND LOADING ---------------- */

/**
 * Load server commands and, only when explicitly enabled, the generated
 * slash versions of the owner DM commands.
 */
function loadAllCommands() {
  const result = loadCommands(client);

  let dmLoaded = 0;
  let dmFailed = 0;

  if (ENABLE_DM_SLASH_COMMANDS) {
    for (const command of dmSlash.buildAll()) {
      try {
        const name = command.data.name.toLowerCase();

        if (client.commands.has(name)) {
          console.log(`[DM SLASH] Skipped duplicate name: ${name}`);
          continue;
        }

        client.commands.set(name, command);
        dmLoaded++;
      } catch (err) {
        dmFailed++;
        console.log(`[DM SLASH] Failed to build ${command?.dmCommand}: ${err.message}`);
      }
    }

    console.log(`📨 Registered ${dmLoaded} DM slash commands${dmFailed ? ` (${dmFailed} failed)` : ''}`);
  } else {
    console.log('📨 DM slash commands disabled — use @bot <command> in DMs.');
  }

  return { ...result, dmLoaded, dmFailed };
}

/* ---------------- SLASH SYNC ---------------- */

async function syncCommands() {
  if (!CLIENT_ID) {
    console.log('⚠️  CLIENT_ID missing — skipping slash command sync.');
    return;
  }

  const body = [];
  let failed = 0;

  for (const command of client.commands.values()) {
    try {
      body.push(command.data.toJSON());
    } catch (err) {
      failed++;
      console.log(`❌ ${command?.data?.name || 'UNKNOWN'} → ${err.message}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log(`🔄 Syncing ${body.length} commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log(`✅ Synced ${body.length} commands${failed ? ` (${failed} failed to build)` : ''}`);
  } catch (err) {
    console.log('❌ Sync failed');
    console.log(err.message);
  }
}

/* ---------------- READY ---------------- */

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  loadAllCommands();

  // Assign a stable #N to every guild so DM commands can target them.
  const numbers = syncConfigNumbers(client);
  console.log(`🔢 Tracking ${Object.keys(numbers).length} server config numbers`);

  store.update(data => {
    data.stats.startedAt = new Date().toISOString();
    if (!data.superOwner && process.env.SUPER_OWNER_ID) {
      data.superOwner = process.env.SUPER_OWNER_ID;
    }
  });

  if (!store.getSuperOwner()) {
    console.log('⚠️  No Super Owner set. Add SUPER_OWNER_ID=<your id> to .env to enable DM commands.');
  }

  // Respect privacy mode across restarts.
  const privacy = store.getPrivacy();

  try {
    client.user.setPresence(
      privacy.privacyMode
        ? { status: 'invisible', activities: [] }
        : { status: 'online', activities: [{ name: '/help', type: ActivityType.Listening }] }
    );
  } catch (err) {
    console.warn('[PRESENCE]', err.message);
  }

  await syncCommands();
});

/* ---------------- EVENTS ---------------- */

client.on(interactionCreate.name, (interaction) =>
  interactionCreate.execute(interaction, client)
);

client.on(messageCreate.name, (message) =>
  messageCreate.execute(message, client)
);

// DM reactions, edits and deletes for the DM logger.
dmEvents.register(client);

/* ---------------- OTJOIN MODE ---------------- */

client.on('guildCreate', async (guild) => {
  const number = getConfigNumber(guild.id);
  console.log(`➕ Joined ${guild.name} (${guild.id}) → #${number}`);

  if (!store.getPrivacy().otjoinMode) return;

  const superOwnerId = store.getSuperOwner();

  // Leave immediately, then tell the Super Owner who added the bot.
  let inviter = null;

  try {
    const logs = await guild.fetchAuditLogs({ type: 28, limit: 1 });
    inviter = logs.entries.first()?.executor || null;
  } catch {
    // Missing View Audit Log - not fatal.
  }

  await guild.leave().catch(() => null);

  if (!superOwnerId) return;

  const owner = await client.users.fetch(superOwnerId).catch(() => null);

  if (owner) {
    await owner.send({
      embeds: [ui.warn('OTJoin — Left a server', ui.bullet([
        `**Server:** ${guild.name} (\`${guild.id}\`)`,
        `**Members:** ${guild.memberCount}`,
        `**Added by:** ${inviter ? `${inviter.tag} (\`${inviter.id}\`)` : 'unknown'}`,
        '',
        'OTJoin mode is on, so the bot left automatically.'
      ]))]
    }).catch(() => null);
  }
});

client.on('guildDelete', (guild) => {
  console.log(`➖ Left ${guild.name} (${guild.id})`);
});

/* ---------------- ERROR HANDLING ---------------- */

client.on('error', err => console.error('[CLIENT ERROR]', err));
client.on('shardError', err => console.error('[SHARD ERROR]', err));

process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection');
  console.log(err);
});

process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception');
  console.log(err);
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);

module.exports = { client, loadAllCommands, syncCommands };
