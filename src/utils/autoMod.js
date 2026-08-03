/**
 * Auto-moderation handler
 * Runs on every message and enforces configured auto-mod filters.
 */
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getServerConfig } = require('../utils/configManager');
const { isStaff, isOwner } = require('../utils/permissions');
const globalStore = require('../utils/globalStore');

const URL_RE = /https?:\/\/[^\s]+/i;
const INVITE_RE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[^\s]+/i;

// Track recent messages per user for spam detection
const recentMessages = new Map(); // `${guildId}-${userId}` -> [{ content, timestamp }]
const SPAM_WINDOW = 5000; // 5 seconds
const SPAM_THRESHOLD = 4;

function cleanupSpam() {
  const now = Date.now();
  for (const [key, msgs] of recentMessages) {
    const filtered = msgs.filter(m => now - m.timestamp < SPAM_WINDOW);
    if (filtered.length === 0) recentMessages.delete(key);
    else recentMessages.set(key, filtered);
  }
}

// Clean up every 30 seconds
setInterval(cleanupSpam, 30000);

async function handleAutoMod(message) {
  if (!message.guild) return;
  if (!message.member) return;
  if (message.author.bot) return;

  const config = getServerConfig(message.guild.id);
  const autoMod = config.autoMod;
  if (!autoMod || !autoMod.enabled) return;

  // Don't moderate staff, owners, or super owners
  if (globalStore.isSuperOwner(message.author.id)) return;
  if (isOwner(config, message.author.id)) return;
  if (isStaff(config, message.member)) return;

  // Check if member has ManageMessages permission (skip moderators)
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const content = message.content || '';
  let triggered = false;
  let reason = '';

  // ─── Link Filter ────────────────────────────────────────
  if (autoMod.linkFilter && URL_RE.test(content)) {
    triggered = true;
    reason = 'Links are not allowed in this channel';
  }

  // ─── Invite Filter ──────────────────────────────────────
  if (!triggered && autoMod.inviteFilter && INVITE_RE.test(content)) {
    triggered = true;
    reason = 'Discord invite links are not allowed';
  }

  // ─── Caps Filter ────────────────────────────────────────
  if (!triggered && autoMod.capsFilter && content.length >= 10) {
    const alpha = content.replace(/[^a-zA-Z]/g, '');
    if (alpha.length >= 10 && alpha === alpha.toUpperCase()) {
      triggered = true;
      reason = 'Excessive caps are not allowed';
    }
  }

  // ─── Mention Spam ───────────────────────────────────────
  if (!triggered && autoMod.mentionSpam) {
    const threshold = autoMod.mentionSpamThreshold || 5;
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions >= threshold || message.mentions.everyone) {
      triggered = true;
      reason = `Mention spam detected (${totalMentions} mentions)`;
    }
  }

  // ─── Word Filter ────────────────────────────────────────
  if (!triggered && autoMod.wordFilter && Array.isArray(autoMod.filteredWords)) {
    const lower = content.toLowerCase();
    for (const word of autoMod.filteredWords) {
      if (word && lower.includes(word.toLowerCase())) {
        triggered = true;
        reason = 'Message contains a filtered word';
        break;
      }
    }
  }

  // ─── Spam Filter (repeated messages) ────────────────────
  if (!triggered && autoMod.spamFilter) {
    const key = `${message.guild.id}-${message.author.id}`;
    const msgs = recentMessages.get(key) || [];
    msgs.push({ content: content.slice(0, 100), timestamp: Date.now() });
    recentMessages.set(key, msgs);

    const recent = msgs.filter(m => Date.now() - m.timestamp < SPAM_WINDOW);
    if (recent.length >= SPAM_THRESHOLD) {
      triggered = true;
      reason = 'Message spam detected';
      recentMessages.delete(key);
    }
  }

  if (!triggered) return;

  // ─── Take Action ────────────────────────────────────────
  const action = autoMod.action || 'delete';

  // Always delete the message
  try {
    await message.delete().catch(() => null);
  } catch {}

  // Build log embed
  const logEmbed = new EmbedBuilder()
    .setColor(0xff6b6b)
    .setAuthor({ name: '🛡️ Auto-Mod Action', iconURL: message.client.user?.displayAvatarURL?.() || undefined })
    .setDescription([
      `**User:** ${message.author} (\`${message.author.id}\`)`,
      `**Channel:** ${message.channel}`,
      `**Reason:** ${reason}`,
      `**Action:** \`${action}\``,
      '',
      `**Message:**`,
      '```',
      content.slice(0, 500) || '_empty_',
      '```',
    ].join('\n'))
    .setFooter({ text: `✦ Icy Companion — Auto-Mod • ${message.guild.name}` })
    .setTimestamp();

  // Warn action
  if (action === 'warn' || action === 'timeout') {
    try {
      await message.author.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle(`⚠️ Auto-Mod Warning — ${message.guild.name}`)
          .setDescription(`Your message was deleted.\n**Reason:** ${reason}`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ]
      }).catch(() => {});
    } catch {}
  }

  // Timeout action
  if (action === 'timeout') {
    const duration = (autoMod.timeoutDuration || 60) * 1000;
    try {
      await message.member.disableCommunicationUntil(
        new Date(Date.now() + duration),
        `[Auto-Mod] ${reason}`
      );
    } catch {}
  }

  // Send to log channel
  const logChannelId = autoMod.logChannel || config.purgeLogChannel;
  if (logChannelId) {
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel?.isTextBased?.()) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }

  // Send ephemeral-like notification in channel (auto-delete after 5s)
  try {
    const notification = await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xff6b6b)
        .setDescription(`🛡️ ${message.author}'s message was auto-deleted: ${reason}`)
        .setFooter({ text: '✦ Auto-Mod' })
        .setTimestamp()
      ]
    });
    setTimeout(() => notification.delete().catch(() => null), 5000);
  } catch {}
}

module.exports = { handleAutoMod };
