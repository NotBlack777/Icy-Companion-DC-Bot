/**
 * DM logger / relay
 * -----------------
 * Logs everything a user does in the bot's DMs into a dedicated channel
 * that lives ONLY inside the server + category the Super Owner chose.
 *
 * Strict targeting is the whole point of this module:
 *   - Channels are only ever created inside `dmLogger.targetCategory`
 *     of `dmLogger.targetGuild`.
 *   - If that destination is missing or unusable, the DM is NOT dumped
 *     somewhere else. It is dropped with a console warning and a single
 *     alert to the Super Owner, so logs never leak into another server.
 *
 * Events covered: new DMs, replies, edits, deletes, reactions
 * (added and removed), attachments and stickers.
 */

const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const store = require('../utils/globalStore');
const ui = require('./ui');

/* ---------------- COLORS ---------------- */

const COLOR = {
  message: 0x5865f2,   // blue   - new DM
  reply: 0x5865f2,     // blue   - reply
  reaction: 0xfee75c,  // yellow - reaction add
  reactionOff: 0xe67e22,
  edit: 0x7dd3fc,      // cyan   - edited
  remove: 0xed4245,    // red    - deleted
  info: 0x57f287       // green  - channel intro
};

/* ---------------- HELPERS ---------------- */

/**
 * Discord channel names: lowercase, no spaces, max 100 chars.
 * Keeps the username readable (sakura_blossoming_everywhere).
 */
function channelNameFor(user) {
  const raw = user.username || user.tag || `user-${user.id}`;

  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

  return clean || `user-${user.id}`;
}

function unixSeconds(date) {
  return Math.floor(new Date(date || Date.now()).getTime() / 1000);
}

/**
 * "Sunday, May 17, 2026 3:20 AM" + "3 months ago", rendered by Discord
 * in each viewer's own timezone.
 */
function timeField(date) {
  const ts = unixSeconds(date);
  return `<t:${ts}:F>\n<t:${ts}:R>`;
}

/**
 * "@Sakura\n1427005016740204604"
 */
function userField(user) {
  return `<@${user.id}>\n\`${user.id}\``;
}

function avatarOf(user) {
  return typeof user?.displayAvatarURL === 'function'
    ? user.displayAvatarURL()
    : undefined;
}

/**
 * Short quote of the message being replied to / reacted on:
 * "Icy Companion: yo alt what are u doing homie."
 */
function quote(message) {
  if (!message) return '_(original message unavailable)_';

  const author = message.author?.username
    || message.author?.tag
    || 'Unknown';

  let body = (message.content || '').replace(/\s+/g, ' ').trim();

  if (!body) {
    if (message.attachments?.size) body = '_(attachment)_';
    else if (message.embeds?.length) body = '_(embed)_';
    else body = '_(no text)_';
  }

  return `**${author}:** ${ui.truncate(body, 300)}`;
}

/**
 * Footer matching the screenshots:
 * "User ID: 1427... • Message ID: 1505... | 05/17/2026 3:20 AM"
 */
function footerFor(user, messageId) {
  const parts = [`User ID: ${user.id}`];
  if (messageId) parts.push(`Message ID: ${messageId}`);
  return parts.join(' • ');
}

function baseEmbed(user, color) {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: user.username || user.tag || String(user.id),
      iconURL: avatarOf(user)
    })
    .setTimestamp();
}

/* ---------------- EMBED BUILDERS ---------------- */

/**
 * 📩 New DM Received
 */
function buildMessageEmbed(user, message, repliedTo = null) {
  const isReply = Boolean(repliedTo);

  const embed = baseEmbed(user, isReply ? COLOR.reply : COLOR.message)
    .setTitle('📩 New DM Received')
    .addFields(
      { name: '👤 User', value: userField(user), inline: false },
      { name: '🕐 Time', value: timeField(message.createdAt), inline: false },
      {
        name: '💬 Type',
        value: isReply ? '↩️ Reply to a message' : '📝 Normal',
        inline: false
      }
    );

  const content = message.content?.trim();

  embed.addFields({
    name: '📝 Message',
    value: content ? ui.truncate(content, 1024) : '_(no text content)_',
    inline: false
  });

  if (isReply) {
    embed.addFields({ name: '↩️ Replied To', value: quote(repliedTo), inline: false });
  }

  // Attachments: preview the first image, list the rest.
  const attachments = [...(message.attachments?.values?.() || [])];

  if (attachments.length) {
    const image = attachments.find(a => a.contentType?.startsWith('image/'));
    if (image) embed.setImage(image.url);

    embed.addFields({
      name: `📎 Attachments (${attachments.length})`,
      value: ui.truncate(
        attachments.map(a => `[${a.name || 'file'}](${a.url})`).join('\n'),
        1024
      ),
      inline: false
    });
  }

  const stickers = [...(message.stickers?.values?.() || [])];

  if (stickers.length) {
    embed.addFields({
      name: '🏷️ Stickers',
      value: stickers.map(s => s.name).join(', ').slice(0, 1024),
      inline: false
    });
  }

  return embed.setFooter({ text: footerFor(user, message.id) });
}

/**
 * 😀 DM Reaction  /  🚫 DM Reaction Removed
 */
function buildReactionEmbed(user, reaction, message, removed = false) {
  const emoji = reaction.emoji?.id
    ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`
    : (reaction.emoji?.name || '❓');

  return baseEmbed(user, removed ? COLOR.reactionOff : COLOR.reaction)
    .setTitle(removed ? '🚫 DM Reaction Removed' : '😀 DM Reaction')
    .addFields(
      { name: '👤 Who Reacted', value: userField(user), inline: false },
      { name: '😀 Emoji', value: emoji, inline: false },
      { name: '🕐 Time', value: timeField(new Date()), inline: false },
      { name: '📥 Reacted On', value: quote(message), inline: false }
    )
    .setFooter({ text: footerFor(user, message?.id) });
}

/**
 * ✏️ DM Edited
 */
function buildEditEmbed(user, oldMessage, newMessage) {
  return baseEmbed(user, COLOR.edit)
    .setTitle('✏️ DM Edited')
    .addFields(
      { name: '👤 User', value: userField(user), inline: false },
      { name: '🕐 Time', value: timeField(newMessage.editedAt || new Date()), inline: false },
      {
        name: '📝 Before',
        value: ui.truncate(oldMessage?.content || '_(unknown)_', 1024),
        inline: false
      },
      {
        name: '📝 After',
        value: ui.truncate(newMessage.content || '_(empty)_', 1024),
        inline: false
      }
    )
    .setFooter({ text: footerFor(user, newMessage.id) });
}

/**
 * 🗑️ DM Deleted
 */
function buildDeleteEmbed(user, message) {
  return baseEmbed(user, COLOR.remove)
    .setTitle('🗑️ DM Deleted')
    .addFields(
      { name: '👤 User', value: userField(user), inline: false },
      { name: '🕐 Time', value: timeField(new Date()), inline: false },
      {
        name: '📝 Message',
        value: ui.truncate(message.content || '_(no cached content)_', 1024),
        inline: false
      }
    )
    .setFooter({ text: footerFor(user, message.id) });
}

/**
 * 📋 DM Log Channel — pinned intro message.
 */
function buildIntroEmbed(user) {
  return baseEmbed(user, COLOR.info)
    .setTitle('📋 DM Log Channel')
    .setDescription(`This channel logs DMs from **${user.username || user.tag}**`)
    .addFields(
      { name: 'User ID', value: `\`${user.id}\``, inline: false },
      {
        name: 'Account Created',
        value: user.createdTimestamp ? `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` : 'Unknown',
        inline: false
      }
    )
    .setFooter({ text: 'Reply here to message the user • prefix with // for an internal note' });
}

/* ---------------- DESTINATION RESOLUTION ---------------- */

/**
 * Resolve the configured destination, or explain exactly why it is not
 * usable. This is the single gate that keeps logs inside the chosen
 * server + category.
 */
function resolveDestination(client) {
  const config = store.getDmLogger();

  if (!config.enabled) {
    return { ok: false, reason: 'DM logger is disabled (`@bot dm logger on`).' };
  }

  if (config.mode !== 'server') {
    return { ok: false, reason: 'DM logger is in DM mode.', dmMode: true };
  }

  if (!config.targetGuild) {
    return { ok: false, reason: 'No target server set. Use `@bot dm mode server <#N/serverid> <category id>`.' };
  }

  const guild = client.guilds.cache.get(config.targetGuild);

  if (!guild) {
    return { ok: false, reason: `The bot is no longer in the target server \`${config.targetGuild}\`.` };
  }

  // A category is required so channels can never spill into the server root.
  if (!config.targetCategory) {
    return { ok: false, reason: `No log category set for **${guild.name}**. Use \`@bot dm mode server ${config.targetGuild} <category id>\`.` };
  }

  const category = guild.channels.cache.get(config.targetCategory);

  if (!category || category.type !== ChannelType.GuildCategory) {
    return { ok: false, reason: `Category \`${config.targetCategory}\` no longer exists in **${guild.name}**.` };
  }

  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return { ok: false, reason: `Missing **Manage Channels** in **${guild.name}**.` };
  }

  return { ok: true, guild, category, config };
}

/**
 * Warn the Super Owner at most once every 10 minutes, so a broken
 * destination does not spam their DMs on every incoming message.
 */
let lastAlertAt = 0;

async function alertSuperOwner(client, reason) {
  console.warn(`[DM LOGGER] ${reason}`);

  if (Date.now() - lastAlertAt < 10 * 60 * 1000) return;
  lastAlertAt = Date.now();

  const superOwnerId = store.getSuperOwner();
  if (!superOwnerId) return;

  const owner = await client.users.fetch(superOwnerId).catch(() => null);
  if (!owner) return;

  await owner.send({
    embeds: [ui.warn('DM Logger Paused', [
      reason,
      '',
      'Incoming DMs are **not** being logged, and nothing was written to any other server.',
      'Run `@bot dm status` to review the configuration.'
    ].join('\n'))]
  }).catch(() => null);
}

/**
 * Find or create this user's log channel inside the configured category.
 */
async function getLogChannel(client, user, destination) {
  const { guild, category } = destination;

  // Existing mapping.
  const knownId = store.getThread(user.id);

  if (knownId) {
    const known = guild.channels.cache.get(knownId);

    // Only reuse it if it is still inside the configured category.
    if (known && known.parentId === category.id) return known;

    // Stale mapping (channel deleted or moved out) - drop it and remake.
    if (!known) store.setThread(user.id, null);
  }

  // Reuse a channel that already matches this user in the category,
  // so a restart does not create duplicates.
  const existing = category.children?.cache?.find(
    channel => channel.topic?.includes(user.id) || channel.name === channelNameFor(user)
  );

  if (existing) {
    store.setThread(user.id, existing.id);
    return existing;
  }

  const channel = await guild.channels.create({
    name: channelNameFor(user),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `DM log for ${user.tag || user.username} (${user.id})`,
    reason: 'DM logger channel'
  });

  store.setThread(user.id, channel.id);

  // Pinned intro, exactly like the screenshots.
  try {
    const intro = await channel.send({ embeds: [buildIntroEmbed(user)] });
    await intro.pin().catch(() => null);
  } catch (err) {
    console.warn('[DM LOGGER] Could not post intro message:', err.message);
  }

  return channel;
}

/**
 * Core dispatch: send an embed to the user's log channel.
 * Returns true when it was logged.
 */
async function logToChannel(client, user, payload) {
  if (store.isBlacklisted(user.id)) return false;

  const destination = resolveDestination(client);

  if (!destination.ok) {
    // DM mode is a valid configuration, not an error.
    if (destination.dmMode) {
      const superOwnerId = store.getSuperOwner();
      if (!superOwnerId) return false;

      const owner = await client.users.fetch(superOwnerId).catch(() => null);
      if (!owner) return false;

      await owner.send(payload).catch(() => null);
      return true;
    }

    await alertSuperOwner(client, destination.reason);
    return false;
  }

  try {
    const channel = await getLogChannel(client, user, destination);
    if (!channel) return false;

    await channel.send(payload);
    return true;
  } catch (err) {
    await alertSuperOwner(client, `Could not write the DM log channel: ${err.message}`);
    return false;
  }
}

/* ---------------- EVENT ENTRY POINTS ---------------- */

/**
 * Should this user's DM activity be logged at all?
 * Owners use DMs for commands, so they are skipped.
 */
function shouldLog(userId) {
  if (store.isBlacklisted(userId)) return false;
  if (store.hasTier(userId, 'junior')) return false;
  return true;
}

async function handleIncomingDm(client, message) {
  if (!shouldLog(message.author.id)) return false;

  let repliedTo = null;

  if (message.reference?.messageId) {
    repliedTo = await message.channel.messages
      .fetch(message.reference.messageId)
      .catch(() => null);
  }

  return logToChannel(client, message.author, {
    embeds: [buildMessageEmbed(message.author, message, repliedTo)]
  });
}

async function handleDmReaction(client, reaction, user, removed = false) {
  if (user.bot) return false;
  if (!shouldLog(user.id)) return false;

  // Resolve partials so the reacted-on message can be quoted.
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return false;
    }
  }

  const message = reaction.message;

  if (message?.partial) {
    try {
      await message.fetch();
    } catch {
      // Quoting will fall back to a placeholder.
    }
  }

  return logToChannel(client, user, {
    embeds: [buildReactionEmbed(user, reaction, message, removed)]
  });
}

async function handleDmEdit(client, oldMessage, newMessage) {
  if (newMessage.author?.bot) return false;
  if (!newMessage.author || !shouldLog(newMessage.author.id)) return false;
  if (oldMessage?.content === newMessage.content) return false;

  return logToChannel(client, newMessage.author, {
    embeds: [buildEditEmbed(newMessage.author, oldMessage, newMessage)]
  });
}

async function handleDmDelete(client, message) {
  if (!message.author || message.author.bot) return false;
  if (!shouldLog(message.author.id)) return false;

  return logToChannel(client, message.author, {
    embeds: [buildDeleteEmbed(message.author, message)]
  });
}

/**
 * Staff reply typed inside a log channel -> delivered to the user.
 * `//` prefix marks an internal note that is not sent.
 */
async function handleRelayReply(client, message) {
  const config = store.getDmLogger();

  if (config.mode !== 'server') return false;
  if (!message.guild || message.guild.id !== config.targetGuild) return false;

  const userId = store.findUserByThread(message.channel.id);
  if (!userId) return false;

  if (message.content.startsWith('//')) {
    await message.react('📝').catch(() => null);
    return true;
  }

  if (!message.content && !message.attachments.size) return false;

  const user = await client.users.fetch(userId).catch(() => null);

  if (!user) {
    await message.reply({
      embeds: [ui.error('User unavailable', `Could not fetch \`${userId}\`.`)]
    }).catch(() => null);
    return true;
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR.info)
    .setAuthor({
      name: 'Staff Reply',
      iconURL: avatarOf(client.user)
    })
    .setDescription(message.content || '_(attachment)_')
    .setTimestamp();

  const image = message.attachments.find(a => a.contentType?.startsWith('image/'));
  if (image) embed.setImage(image.url);

  try {
    await user.send({ embeds: [embed] });
    await message.react('✅').catch(() => null);
  } catch (err) {
    await message.react('❌').catch(() => null);
    await message.reply({
      embeds: [ui.error(
        'Delivery failed',
        err.code === 50007 ? 'Their DMs are closed or the bot is blocked.' : err.message
      )]
    }).catch(() => null);
  }

  return true;
}

module.exports = {
  handleIncomingDm,
  handleDmReaction,
  handleDmEdit,
  handleDmDelete,
  handleRelayReply,

  // Exported for commands and tests.
  resolveDestination,
  getLogChannel,
  channelNameFor,
  buildMessageEmbed,
  buildReactionEmbed,
  buildEditEmbed,
  buildDeleteEmbed,
  buildIntroEmbed,
  shouldLog,
  COLOR
};
