/**
 * DM logger / relay
 * -----------------
 * Forwards DMs that ordinary users send to the bot, so the Super Owner
 * can read (and reply to) them.
 *
 * Modes:
 *   'dm'     -> forward into the Super Owner's DMs
 *   'server' -> one text channel per user inside a chosen guild/category
 *
 * In 'server' mode, a staff message in a relay channel is sent back to
 * the user, giving a full two-way modmail flow.
 */

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const store = require('../utils/globalStore');
const ui = require('./ui');

function sanitizeChannelName(user) {
  const base = `${user.username}-${user.discriminator && user.discriminator !== '0' ? user.discriminator : user.id.slice(-4)}`;

  return base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90) || `user-${user.id}`;
}

function buildRelayEmbed(user, message) {
  // Users can arrive partially cached, so avatar lookup must be optional.
  const avatar = typeof user.displayAvatarURL === 'function'
    ? user.displayAvatarURL()
    : undefined;

  const embed = new EmbedBuilder()
    .setColor(ui.COLORS.brand)
    .setAuthor({ name: user.tag || user.username || user.id, iconURL: avatar })
    .setDescription(message.content || '_(no text content)_')
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp(message.createdAt || new Date());

  const attachment = message.attachments?.first?.();

  if (attachment) {
    if (attachment.contentType?.startsWith('image/')) {
      embed.setImage(attachment.url);
    } else {
      embed.addFields({ name: '📎 Attachment', value: `[${attachment.name}](${attachment.url})` });
    }
  }

  if ((message.attachments?.size || 0) > 1) {
    embed.addFields({
      name: `📎 Attachments (${message.attachments.size})`,
      value: [...message.attachments.values()].map(a => `[${a.name}](${a.url})`).join('\n').slice(0, 1000)
    });
  }

  return embed;
}

/**
 * Find or create the relay channel for a user in 'server' mode.
 */
async function getRelayChannel(client, user) {
  const config = store.getDmLogger();
  const guild = client.guilds.cache.get(config.targetGuild);

  if (!guild) return null;

  const existingId = store.getThread(user.id);

  if (existingId) {
    const existing = guild.channels.cache.get(existingId);
    if (existing) return existing;
  }

  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.warn('[DM LOGGER] Missing Manage Channels in the relay guild.');
    return null;
  }

  try {
    const channel = await guild.channels.create({
      name: sanitizeChannelName(user),
      type: ChannelType.GuildText,
      parent: config.targetCategory || undefined,
      topic: `DM relay for ${user.tag} (${user.id})`,
      reason: 'DM logger relay channel'
    });

    store.setThread(user.id, channel.id);

    await channel.send({
      embeds: [ui.info(`📨 DM relay — ${user.tag}`, ui.bullet([
        `**User:** ${user.tag} (\`${user.id}\`)`,
        `**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
        '',
        'Messages sent in this channel are delivered back to the user.',
        'Start a message with `//` to leave an internal note instead.'
      ]))]
    });

    return channel;
  } catch (err) {
    console.warn('[DM LOGGER] Could not create relay channel:', err.message);
    return null;
  }
}

/**
 * Handle an incoming DM from a normal user.
 * Returns true when the message was relayed.
 */
async function handleIncomingDm(client, message) {
  const config = store.getDmLogger();

  if (!config.enabled) return false;
  if (store.isBlacklisted(message.author.id)) return false;

  // Owners use DMs for commands, not modmail.
  if (store.hasTier(message.author.id, 'junior')) return false;

  const embed = buildRelayEmbed(message.author, message);

  if (config.mode === 'server' && config.targetGuild) {
    const channel = await getRelayChannel(client, message.author);

    if (channel) {
      await channel.send({ embeds: [embed] }).catch(err =>
        console.warn('[DM LOGGER] Relay send failed:', err.message)
      );
      return true;
    }
    // Fall through to DM mode if the channel could not be made.
  }

  const superOwnerId = store.getSuperOwner();
  if (!superOwnerId) return false;

  try {
    const owner = await client.users.fetch(superOwnerId);

    await owner.send({
      content: `📨 **New DM** — reply with \`@bot dm ${message.author.id} <message>\``,
      embeds: [embed]
    });

    return true;
  } catch (err) {
    console.warn('[DM LOGGER] Could not forward DM to Super Owner:', err.message);
    return false;
  }
}

/**
 * Handle a staff reply typed inside a relay channel ('server' mode).
 * Returns true when the message was delivered to the user.
 */
async function handleRelayReply(client, message) {
  const config = store.getDmLogger();

  if (config.mode !== 'server') return false;
  if (!message.guild || message.guild.id !== config.targetGuild) return false;

  const userId = store.findUserByThread(message.channel.id);
  if (!userId) return false;

  // `//` prefix = internal note, do not send.
  if (message.content.startsWith('//')) {
    await message.react('📝').catch(() => null);
    return true;
  }

  if (!message.content && !message.attachments.size) return false;

  const user = await client.users.fetch(userId).catch(() => null);

  if (!user) {
    await message.reply({ embeds: [ui.error('User unavailable', `Could not fetch \`${userId}\`.`)] }).catch(() => null);
    return true;
  }

  const embed = new EmbedBuilder()
    .setColor(ui.COLORS.success)
    .setAuthor({ name: 'Staff Reply', iconURL: client.user.displayAvatarURL() })
    .setDescription(message.content || '_(attachment)_')
    .setTimestamp();

  const attachment = message.attachments.first();
  if (attachment?.contentType?.startsWith('image/')) embed.setImage(attachment.url);

  try {
    await user.send({ embeds: [embed] });
    await message.react('✅').catch(() => null);
  } catch (err) {
    await message.react('❌').catch(() => null);
    await message.reply({
      embeds: [ui.error('Delivery failed', err.code === 50007 ? 'Their DMs are closed.' : err.message)]
    }).catch(() => null);
  }

  return true;
}

module.exports = { handleIncomingDm, handleRelayReply, getRelayChannel, buildRelayEmbed };
