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

const { ChannelType, PermissionFlagsBits } = require('discord.js');

const registry = require('../registry');
const ui = require('../ui');
const store = require('../../utils/globalStore');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { resolveDestination } = require('../logger');

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
  usage: '@bot dm mode server <#N/serverid> <cat id>',
  desc: 'Log DMs into one server + category only',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'category', type: 'channel', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const category = resolved.guild.channels.cache.get(String(args.category));

    // A category is mandatory, so log channels can never spill into the
    // server root or into a different server.
    if (!category || category.type !== ChannelType.GuildCategory) {
      const available = resolved.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => `> \`${c.id}\` — ${c.name}`)
        .slice(0, 10)
        .join('\n');

      return {
        embeds: [ui.error('Invalid category', [
          `\`${args.category}\` is not a category in **${resolved.guild.name}**.`,
          available ? `\n**Categories in this server:**\n${available}` : ''
        ].join('\n'))]
      };
    }

    const me = resolved.guild.members.me;
    const missing = [];

    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) missing.push('Manage Channels');
    if (!me?.permissionsIn(category).has(PermissionFlagsBits.ViewChannel)) missing.push('View Channel (in category)');
    if (!me?.permissionsIn(category).has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages (in category)');

    if (missing.length) {
      return {
        embeds: [ui.error('Missing permissions', [
          `The bot needs these in **${resolved.guild.name}**:`,
          ...missing.map(p => `> ${p}`)
        ].join('\n'))]
      };
    }

    store.setDmLogger({
      mode: 'server',
      enabled: true,
      targetGuild: resolved.guildId,
      targetCategory: category.id
    });

    return {
      embeds: [ui.success('DM Logger — Server Mode', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Category:** ${category.name} (\`${category.id}\`)`,
        '',
        'One channel per user is created **inside this category only**.',
        'Logs messages, replies, edits, deletes and reactions.',
        'Nothing is ever written to any other server or category.'
      ]))]
    };
  }
});

/* ---------------- ENABLE / DISABLE ---------------- */

registry.define({
  name: 'dm logger on',
  aliases: ['dm on'],
  group: 'dmlogger',
  usage: '@bot dm logger on',
  desc: 'Enable DM logging',
  async run() {
    store.setDmLogger({ enabled: true });
    return { embeds: [ui.success('DM Logger Enabled', 'Incoming DM activity is being logged again.')] };
  }
});

registry.define({
  name: 'dm logger off',
  aliases: ['dm off'],
  group: 'dmlogger',
  usage: '@bot dm logger off',
  desc: 'Disable DM logging',
  async run() {
    store.setDmLogger({ enabled: false });
    return { embeds: [ui.warn('DM Logger Disabled', 'DM activity will not be logged until you run `@bot dm logger on`.')] };
  }
});

/* ---------------- STATUS ---------------- */

registry.define({
  name: 'dm status',
  group: 'dmlogger',
  usage: '@bot dm status',
  desc: 'Show DM logger configuration and health',
  async run({ ctx }) {
    const logger = store.getDmLogger();
    const guild = logger.targetGuild ? ctx.client.guilds.cache.get(logger.targetGuild) : null;
    const category = guild && logger.targetCategory
      ? guild.channels.cache.get(logger.targetCategory)
      : null;

    // Live check against the same gate the logger itself uses.
    const destination = resolveDestination(ctx.client);

    const embed = ui.info('📨 DM Logger Status').addFields({
      name: 'Configuration',
      value: ui.codeTable({
        Enabled: logger.enabled ? 'yes' : 'no',
        Mode: logger.mode,
        Server: guild ? guild.name : (logger.targetGuild || 'not set'),
        Category: category ? category.name : (logger.targetCategory || 'not set'),
        Blacklisted: logger.blacklist.length,
        'Log channels': Object.keys(logger.threads || {}).length
      })
    });

    if (destination.ok) {
      embed.addFields({
        name: '✅ Health',
        value: ui.bullet([
          `Logging into **${destination.guild.name}** → **${destination.category.name}**`,
          'Messages, replies, edits, deletes and reactions are captured.',
          'No other server or category is ever written to.'
        ])
      });
    } else if (destination.dmMode) {
      embed.addFields({
        name: 'ℹ️ Health',
        value: ui.bullet([
          'DM mode: activity is forwarded to the Super Owner\'s DMs.',
          'Use `@bot dm mode server <#N/serverid> <category id>` to log into a category.'
        ])
      });
    } else {
      embed.addFields({
        name: '⚠️ Not logging',
        value: ui.bullet([
          destination.reason,
          'Nothing is being written anywhere until this is fixed.'
        ])
      });
    }

    return { embeds: [embed] };
  }
});

module.exports = {};
