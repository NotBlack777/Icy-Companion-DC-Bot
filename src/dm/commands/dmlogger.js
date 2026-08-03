/**
 * DM Logger commands:
 *   dm blacklist add/remove/list
 *   dm mode dm
 *   dm mode server <id> [cat id]
 *   dm status
 *
 * The logger itself lives in src/dm/logger.js - these commands only
 * configure it.
 */

const registry = require('../registry');
const ui = require('../ui');
const store = require('../../utils/globalStore');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');

/* ---------------- BLACKLIST ---------------- */

registry.define({
  name: 'dm blacklist add',
  group: 'dmlogger',
  usage: '@bot dm blacklist add <id>',
  desc: 'Stop relaying DMs from a user',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isBlacklisted(userId)) {
      return { embeds: [ui.warn('Already blacklisted', `<@${userId}> is already on the DM blacklist.`)] };
    }

    store.blacklistAdd(userId);

    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Blacklisted', `DMs from ${user ? `**${user.tag}**` : `\`${userId}\``} will no longer be relayed.`)]
    };
  }
});

registry.define({
  name: 'dm blacklist remove',
  group: 'dmlogger',
  usage: '@bot dm blacklist remove <id>',
  desc: 'Resume relaying DMs from a user',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (!store.isBlacklisted(userId)) {
      return { embeds: [ui.warn('Not blacklisted', `<@${userId}> is not on the DM blacklist.`)] };
    }

    store.blacklistRemove(userId);

    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Removed', `DMs from ${user ? `**${user.tag}**` : `\`${userId}\``} will be relayed again.`)]
    };
  }
});

registry.define({
  name: 'dm blacklist list',
  aliases: ['dm blacklist'],
  group: 'dmlogger',
  usage: '@bot dm blacklist list',
  desc: 'Show the DM blacklist',
  async run({ ctx }) {
    const { blacklist } = store.getDmLogger();

    if (!blacklist.length) {
      return { embeds: [ui.info('📨 DM Blacklist', 'The blacklist is empty.')] };
    }

    const lines = [];

    for (const userId of blacklist) {
      const user = await ctx.client.users.fetch(userId).catch(() => null);
      lines.push(`> \`${userId}\` ${user ? `— **${user.tag}**` : ''}`);
    }

    return {
      embeds: [ui.info(`📨 DM Blacklist (${blacklist.length})`, lines.join('\n'))]
    };
  }
});

/* ---------------- MODE ---------------- */

registry.define({
  name: 'dm mode dm',
  group: 'dmlogger',
  usage: '@bot dm mode dm',
  desc: 'Relay incoming DMs to your DMs',
  async run() {
    store.setDmLogger({ mode: 'dm', enabled: true, targetGuild: null, targetCategory: null });

    return {
      embeds: [ui.success('Mode: DM', 'Incoming user DMs will be forwarded to the Super Owner\'s DMs.')]
    };
  }
});

registry.define({
  name: 'dm mode server',
  group: 'dmlogger',
  usage: '@bot dm mode server <id> [cat id]',
  desc: 'Relay incoming DMs into server channels',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'category', type: 'channel', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    let categoryId = null;

    if (args.category) {
      const category = resolved.guild.channels.cache.get(String(args.category));

      if (!category || category.type !== 4) {
        return { embeds: [ui.error('Invalid category', `\`${args.category}\` is not a category in **${resolved.guild.name}**.`)] };
      }

      categoryId = category.id;
    }

    store.setDmLogger({
      mode: 'server',
      enabled: true,
      targetGuild: resolved.guildId,
      targetCategory: categoryId
    });

    return {
      embeds: [ui.success('Mode: Server', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Category:** ${categoryId ? `<#${categoryId}>` : 'none (channels go to the top level)'}`,
        'A channel is created per user on their first DM.'
      ]))]
    };
  }
});

/* ---------------- STATUS ---------------- */

registry.define({
  name: 'dm status',
  group: 'dmlogger',
  usage: '@bot dm status',
  desc: 'Show DM logger configuration',
  async run({ ctx }) {
    const logger = store.getDmLogger();
    const guild = logger.targetGuild ? ctx.client.guilds.cache.get(logger.targetGuild) : null;

    return {
      embeds: [ui.info('📨 DM Logger Status').addFields({
        name: 'Configuration',
        value: ui.codeTable({
          Enabled: logger.enabled ? 'yes' : 'no',
          Mode: logger.mode,
          Server: guild ? guild.name : (logger.targetGuild || 'n/a'),
          Category: logger.targetCategory || 'n/a',
          Blacklisted: logger.blacklist.length,
          'Open threads': Object.keys(logger.threads || {}).length
        })
      })]
    };
  }
});

module.exports = {};
