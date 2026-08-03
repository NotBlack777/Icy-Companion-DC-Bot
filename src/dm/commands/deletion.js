/**
 * Delete commands: delete, sdelete, dmdelete, clear.
 */

const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');

/**
 * Search recent history of every text channel the bot can read for a
 * message ID. Used by `@bot delete` which is not given a channel.
 */
async function findMessageAnywhere(client, messageId, { guild = null, limit = 60 } = {}) {
  const guilds = guild ? [guild] : [...client.guilds.cache.values()];

  for (const target of guilds) {
    const channels = target.channels.cache.filter(
      channel => channel.isTextBased?.() && channel.viewable
    );

    for (const channel of channels.values()) {
      try {
        const message = await channel.messages.fetch(messageId);
        if (message) return { message, channel, guild: target };
      } catch {
        // Not in this channel - keep looking.
      }

      // Avoid hammering the API on very large servers.
      if (--limit <= 0) break;
    }
  }

  return null;
}

/* ---------------- DELETE ---------------- */

registry.define({
  name: 'delete',
  aliases: ['del'],
  group: 'delete',
  usage: '@bot delete <msg id>',
  desc: 'Delete a bot message by ID (searches all servers)',
  secure: true,
  args: [{ name: 'message', type: 'word', required: true }],
  async run({ ctx, args }) {
    const found = await findMessageAnywhere(ctx.client, args.message);

    if (!found) {
      return {
        embeds: [ui.error('Message not found', `Could not locate \`${args.message}\`.\n> Try \`@bot sdelete <#N/serverid> <msg id>\` to target one server.`)]
      };
    }

    try {
      await found.message.delete();
    } catch (err) {
      return { embeds: [ui.error('Delete failed', err.message)] };
    }

    return {
      embeds: [ui.success('Message Deleted', ui.bullet([
        `**Server:** ${serverLabel(found.guild)}`,
        `**Channel:** <#${found.channel.id}>`,
        `**Message:** \`${args.message}\``
      ]))]
    };
  }
});

/* ---------------- SDELETE ---------------- */

registry.define({
  name: 'sdelete',
  group: 'delete',
  usage: '@bot sdelete <#N/serverid> <msg id>',
  desc: 'Delete a message inside a specific server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'message', type: 'word', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const found = await findMessageAnywhere(ctx.client, args.message, { guild: resolved.guild });

    if (!found) {
      return { embeds: [ui.error('Message not found', `\`${args.message}\` was not found in **${resolved.guild.name}**.`)] };
    }

    try {
      await found.message.delete();
    } catch (err) {
      return { embeds: [ui.error('Delete failed', err.message)] };
    }

    return {
      embeds: [ui.success('Message Deleted', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Channel:** <#${found.channel.id}>`,
        `**Message:** \`${args.message}\``
      ]))]
    };
  }
});

/* ---------------- DMDELETE ---------------- */

registry.define({
  name: 'dmdelete',
  aliases: ['dmdel'],
  group: 'delete',
  usage: '@bot dmdelete <msg id>',
  desc: 'Delete one of the bot\'s own DM messages',
  secure: true,
  args: [{ name: 'message', type: 'word', required: true }],
  async run({ ctx, args }) {
    const channel = ctx.channel;

    if (!channel) {
      return { embeds: [ui.error('No channel', 'Could not access this DM channel.')] };
    }

    let message;

    try {
      message = await channel.messages.fetch(args.message);
    } catch {
      return { embeds: [ui.error('Message not found', `\`${args.message}\` is not in this DM.`)] };
    }

    if (message.author.id !== ctx.client.user.id) {
      return { embeds: [ui.error('Cannot delete', 'The bot can only delete its own DM messages.')] };
    }

    try {
      await message.delete();
    } catch (err) {
      return { embeds: [ui.error('Delete failed', err.message)] };
    }

    return { embeds: [ui.success('DM Deleted', `Removed \`${args.message}\`.`)] };
  }
});

/* ---------------- CLEAR ---------------- */

registry.define({
  name: 'clear',
  aliases: ['purge'],
  group: 'delete',
  usage: '@bot clear <#N/serverid> <channel id> <amount>',
  desc: 'Bulk delete messages in a channel',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'channel', type: 'channel', required: true },
    { name: 'amount', type: 'int', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const amount = Math.min(Math.max(Number(args.amount) || 0, 1), 100);
    const channel = resolved.guild.channels.cache.get(String(args.channel));

    if (!channel?.isTextBased?.()) {
      return { embeds: [ui.error('Channel not found', `\`${args.channel}\` is not a text channel in **${resolved.guild.name}**.`)] };
    }

    let deleted;

    try {
      // bulkDelete cannot touch messages older than 14 days.
      deleted = await channel.bulkDelete(amount, true);
    } catch (err) {
      return { embeds: [ui.error('Clear failed', err.message)] };
    }

    const skipped = amount - deleted.size;

    return {
      embeds: [ui.success('Messages Cleared', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Channel:** <#${channel.id}>`,
        `**Deleted:** \`${deleted.size}\``,
        skipped > 0 ? `**Skipped:** \`${skipped}\` (older than 14 days or already gone)` : null
      ]))]
    };
  }
});

module.exports = { findMessageAnywhere };
