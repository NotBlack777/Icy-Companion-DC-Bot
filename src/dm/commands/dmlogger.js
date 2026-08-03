/**
 * DM Logger commands: dm blacklist add/remove/list, dm mode,
 * dm logger on/off, dm status.
 * Icy futuristic UI.
 */

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const store     = require('../../utils/globalStore');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { resolveDestination } = require('../logger');

const { ICY } = ui;

function icyDivider() { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

/* ─── BLACKLIST ADD ──────────────────────────────────────────────── */
registry.define({
  name: 'dm blacklist add',
  group: 'dmlogger',
  usage: '@bot dm blacklist add <id>',
  desc: 'Stop relaying DMs from a user',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (store.isBlacklisted(userId))
      return { embeds: [ui.warn('Already Blacklisted', `<@${userId}> is already on the DM blacklist.`)] };

    store.blacklistAdd(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.error)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🚫 User Blacklisted')
        .setDescription([
          icyDivider(),
          `DMs from ${user ? `**${user.tag}**` : `\`${userId}\``} will **no longer** be relayed.`,
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── BLACKLIST REMOVE ───────────────────────────────────────────── */
registry.define({
  name: 'dm blacklist remove',
  group: 'dmlogger',
  usage: '@bot dm blacklist remove <id>',
  desc: 'Resume relaying DMs from a user',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (!store.isBlacklisted(userId))
      return { embeds: [ui.warn('Not Blacklisted', `<@${userId}> is not on the DM blacklist.`)] };

    store.blacklistRemove(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Blacklist Removed')
        .setDescription([
          icyDivider(),
          `DMs from ${user ? `**${user.tag}**` : `\`${userId}\``} will be relayed again.`,
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── BLACKLIST LIST ────────────────────────────────────────────── */
registry.define({
  name: 'dm blacklist list',
  aliases: ['dm blacklist'],
  group: 'dmlogger',
  usage: '@bot dm blacklist list',
  desc: 'Show the DM blacklist',
  async run({ ctx }) {
    const { blacklist } = store.getDmLogger();

    if (!blacklist.length)
      return { embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('📨 DM Blacklist')
        .setDescription([ icyDivider(), 'The blacklist is **empty**.', icyDivider() ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]};

    const lines = blacklist.map(id => {
      const user = ctx.client.users.cache.get(id);
      return `> \`${id}\` ${user ? `— **${user.tag}**` : ''}`;
    });

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`📨 DM Blacklist (${blacklist.length})`)
        .setDescription([ icyDivider(), lines.join('\n'), icyDivider() ].join('\n'))
        .setFooter({ text: `✦ ${blacklist.length} user(s) blacklisted` })
        .setTimestamp()
      ]
    };
  }
});

/* ─── MODE DM ─────────────────────────────────────────────────────── */
registry.define({
  name: 'dm mode dm',
  group: 'dmlogger',
  usage: '@bot dm mode dm',
  desc: 'Relay incoming DMs to your DMs',
  async run({ ctx }) {
    store.setDmLogger({ mode: 'dm', enabled: true, targetGuild: null, targetCategory: null });
    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('📨 Mode: Direct Message')
        .setDescription([
          icyDivider(),
          'Incoming user DMs will be **forwarded to the Super Owner\'s DMs**.',
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── MODE SERVER ────────────────────────────────────────────────── */
registry.define({
  name: 'dm mode server',
  group: 'dmlogger',
  usage: '@bot dm mode server <#N/serverid> <cat id>',
  desc: 'Log DMs into one server + category only',
  args: [
    { name: 'server',   type: 'server',   required: true },
    { name: 'category', type: 'channel', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const category = resolved.guild.channels.cache.get(String(args.category));
    if (!category || category.type !== ChannelType.GuildCategory) {
      const available = resolved.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory)
        .map(c => `> \`${c.id}\` — ${c.name}`).slice(0,10).join('\n');
      return {
        embeds: [ui.error('Invalid Category', [
          `\`${args.category}\` is not a category in **${resolved.guild.name}**.`,
          available ? `\n**Categories in this server:**\n${available}` : '',
        ].join('\n'))]
      };
    }

    const me = resolved.guild.members.me;
    const missing = [];
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) missing.push('Manage Channels');
    if (!me?.permissionsIn(category).has(PermissionFlagsBits.ViewChannel)) missing.push('View Channel (category)');
    if (!me?.permissionsIn(category).has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages (category)');

    if (missing.length)
      return { embeds: [ui.error('Missing Permissions', [ 'The bot needs:', ...missing.map(p => `> ${p}`) ].join('\n'))] };

    store.setDmLogger({ mode: 'server', enabled: true, targetGuild: resolved.guildId, targetCategory: category.id });

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ DM Logger — Server Mode')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**Category:** ${category.name} (\`${category.id}\`)`,
            '',
            'One channel per user is created **inside this category only**.',
            'Logs messages, replies, edits, deletes and reactions.',
            'Nothing is ever written to any other server or category.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── LOGGER ON/OFF ──────────────────────────────────────────────── */
registry.define({
  name: 'dm logger on',
  aliases: ['dm on'],
  group: 'dmlogger',
  usage: '@bot dm logger on',
  desc: 'Enable DM logging',
  async run({ ctx }) {
    store.setDmLogger({ enabled: true });
    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ DM Logger Enabled')
        .setDescription([ icyDivider(), 'Incoming DM activity is being logged again.', icyDivider() ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

registry.define({
  name: 'dm logger off',
  aliases: ['dm off'],
  group: 'dmlogger',
  usage: '@bot dm logger off',
  desc: 'Disable DM logging',
  async run({ ctx }) {
    store.setDmLogger({ enabled: false });
    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.warn)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⚠️ DM Logger Disabled')
        .setDescription([
          icyDivider(),
          'DM activity will **not** be logged until you run `@bot dm logger on`.',
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── STATUS ────────────────────────────────────────────────────── */
registry.define({
  name: 'dm status',
  group: 'dmlogger',
  usage: '@bot dm status',
  desc: 'Show DM logger configuration and health',
  async run({ ctx }) {
    const logger     = store.getDmLogger();
    const guild      = logger.targetGuild ? ctx.client.guilds.cache.get(logger.targetGuild) : null;
    const category   = guild && logger.targetCategory ? guild.channels.cache.get(logger.targetCategory) : null;
    const dest       = resolveDestination(ctx.client);

    const healthColor = dest.ok ? ICY.success : dest.dmMode ? ICY.frost : ICY.error;
    const healthTitle = dest.ok ? '✅ Healthy & Logging' : dest.dmMode ? 'ℹ️ DM Mode Active' : '⚠️ Not Logging';
    const healthDesc = dest.ok
      ? ui.bullet([ `Logging into **${dest.guild.name}** → **${dest.category.name}**.`, 'Messages, replies, edits, deletes and reactions are captured.' ])
      : dest.dmMode
        ? ui.bullet([ 'Activity is forwarded to your DMs.', 'Use `@bot dm mode server <#N> <category id>` to log into a category.' ])
        : ui.bullet([ dest.reason, 'Nothing is being written anywhere until this is fixed.' ]);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('📨 DM Logger Status')
        .setDescription([
          icyDivider(),
          ui.codeTable({
            Enabled:     logger.enabled ? '✅ yes' : '❌ no',
            Mode:        logger.mode || 'not set',
            Server:      guild ? guild.name : (logger.targetGuild || 'not set'),
            Category:    category ? category.name : (logger.targetCategory || 'not set'),
            Blacklisted: logger.blacklist?.length || 0,
            'Log chans': Object.keys(logger.threads || {}).length,
          }),
          icyDivider(),
        ].join('\n'))
        .addFields(
          { name: healthTitle, value: Array.isArray(healthDesc) ? healthDesc.join('\n') : healthDesc, inline: false },
        )
        .setFooter({ text: '✦ Icy Companion — DM Logger' })
        .setTimestamp()
      ]
    };
  }
});

module.exports = {};
