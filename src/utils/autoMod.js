/**
 * Auto-moderation handler
 * Runs on every message and enforces configured auto-mod filters.
 */
const { PermissionFlagsBits } = require('discord.js');
const { getServerConfig } = require('../utils/configManager');
const { isStaff, isOwner } = require('../utils/permissions');
const globalStore = require('../utils/globalStore');
const { createEmbed, e } = require('./uiHelper');

const URL_RE = /https?:\/\/[^\s]+/i;
const INVITE_RE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[^\s]+/i;

const recentMessages = new Map();
const SPAM_WINDOW = 5000;
const SPAM_THRESHOLD = 4;

function cleanupSpam() {
  const now = Date.now();
  for (const [key, msgs] of recentMessages) {
    const filtered = msgs.filter(m => now - m.timestamp < SPAM_WINDOW);
    if (filtered.length === 0) recentMessages.delete(key);
    else recentMessages.set(key, filtered);
  }
}

setInterval(cleanupSpam, 30000);

async function handleAutoMod(message) {
  if (!message.guild || !message.member || message.author.bot) return;

  const config = getServerConfig(message.guild.id);
  const autoMod = config.autoMod;
  if (!autoMod || !autoMod.enabled) return;

  if (globalStore.isSuperOwner(message.author.id) || isOwner(config, message.author.id) || isStaff(config, message.member)) return;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const content = message.content || '';
  let triggered = false;
  let reason = '';

  if (autoMod.linkFilter && URL_RE.test(content)) {
    triggered = true;
    reason = 'Links are not allowed';
  } else if (autoMod.inviteFilter && INVITE_RE.test(content)) {
    triggered = true;
    reason = 'Invite links are not allowed';
  } else if (autoMod.capsFilter && content.length >= 10) {
    const alpha = content.replace(/[^a-zA-Z]/g, '');
    if (alpha.length >= 10 && alpha === alpha.toUpperCase()) {
      triggered = true;
      reason = 'Excessive caps';
    }
  } else if (autoMod.mentionSpam) {
    const threshold = autoMod.mentionSpamThreshold || 5;
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions >= threshold || message.mentions.everyone) {
      triggered = true;
      reason = `Mention spam (${totalMentions} mentions)`;
    }
  } else if (autoMod.wordFilter && Array.isArray(autoMod.filteredWords)) {
    const lower = content.toLowerCase();
    for (const word of autoMod.filteredWords) {
      if (word && lower.includes(word.toLowerCase())) {
        triggered = true;
        reason = 'Filtered word detected';
        break;
      }
    }
  } else if (autoMod.spamFilter) {
    const key = `${message.guild.id}-${message.author.id}`;
    const msgs = recentMessages.get(key) || [];
    msgs.push({ content: content.slice(0, 100), timestamp: Date.now() });
    recentMessages.set(key, msgs);
    const recent = msgs.filter(m => Date.now() - m.timestamp < SPAM_WINDOW);
    if (recent.length >= SPAM_THRESHOLD) {
      triggered = true;
      reason = 'Repeated spam detected';
      recentMessages.delete(key);
    }
  }

  if (!triggered) return;

  const action = autoMod.action || 'delete';
  try { await message.delete().catch(() => null); } catch {}

  const logEmbed = createEmbed({
    color: 0xff3d71,
    author: { name: 'Auto-Mod Shield', iconURL: message.client.user.displayAvatarURL() },
    description: `### ${e('error')} Punishment Details\n` +
                 `> **User:** ${message.author} (\`${message.author.id}\`)\n` +
                 `> **Channel:** ${message.channel}\n` +
                 `> **Reason:** ${reason}\n` +
                 `> **Action Taken:** \`${action}\`\n\n` +
                 `**Filtered Message:**\n\`\`\`\n${content.slice(0, 500) || '_empty_'}\n\`\`\``,
    timestamp: true
  });

  if (action === 'warn' || action === 'timeout') {
    const dmEmbed = createEmbed({
      color: 0xff3d71,
      description: `### ${e('error')} Auto-Mod Alert\n` +
                   `> **Server:** ${message.guild.name}\n` +
                   `> **Your message was deleted.**\n` +
                   `> **Reason:** ${reason}`,
      timestamp: true
    });
    await message.author.send({ embeds: [dmEmbed] }).catch(() => null);
  }

  if (action === 'timeout') {
    const duration = (autoMod.timeoutDuration || 60) * 1000;
    try { await message.member.disableCommunicationUntil(new Date(Date.now() + duration), `[Auto-Mod] ${reason}`); } catch {}
  }

  const logChannelId = autoMod.logChannel || config.purgeLogChannel;
  if (logChannelId) {
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel?.isTextBased?.()) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }

  try {
    const notification = await message.channel.send({
      embeds: [createEmbed({
        color: 0xff3d71,
        description: `${e('error')} ${message.author}'s message was auto-deleted: **${reason}**`
      })]
    });
    setTimeout(() => notification.delete().catch(() => null), 5000);
  } catch {}
}

module.exports = { handleAutoMod };
