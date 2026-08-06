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

function icyDivider() { return ui.DIVIDER; }

function loggerPanel(ctx, title, lines, color = ICY.frost, options = {}) {
  return ui.panel(title, lines, {
    color,
    author: {
      name: '🌅 Icy Companion • DM Access Matrix',
      iconURL: ctx.client.user?.displayAvatarURL?.() || undefined
    },
    footer: options.footer || 'DM Logger • Sunset Ice Access',
    compact: options.compact || false
  });
}

async function userLines(ctx, ids) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))];

  if (!unique.length) return ['> _Nobody yet._'];

  return Promise.all(unique.map(async (id, index) => {
    const user = ctx.client.users.cache.get(id) || await ctx.client.users.fetch(id).catch(() => null);
    return `> **${index + 1}.** ${user ? `**${user.tag}**` : `<@${id}>`}  \`${id}\``;
  }));
}

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


/* ─── DM ACCESS MODE: BLACKLIST ─────────────────────────────────── */
registry.define({
  name: 'dm mode blacklist',
  aliases: ['dm access blacklist', 'dm blacklist mode'],
  group: 'dmlogger',
  usage: '@bot dm mode blacklist',
  desc: 'Relay everyone except blacklisted users',
  async run({ ctx }) {
    store.setDmAccessMode('blacklist');
    const logger = store.getDmLogger();

    return {
      embeds: [loggerPanel(ctx, 'Blacklist Mode Enabled', [
        '🟧 **Access mode switched to blacklist.**',
        '',
        ui.bullet([
          'Incoming DMs from normal users will be relayed/logged by default.',
          `Users on the blacklist stay blocked: \`${logger.blacklist?.length || 0}\``,
          'Use `@bot dm blacklist add <user id>` to block someone.'
        ])
      ], ICY.amber)]
    };
  }
});

/* ─── DM ACCESS MODE: WHITELIST ─────────────────────────────────── */
registry.define({
  name: 'dm mode whitelist',
  aliases: ['dm access whitelist', 'dm whitelist mode'],
  group: 'dmlogger',
  usage: '@bot dm mode whitelist',
  desc: 'Only relay users with whitelist access',
  async run({ ctx }) {
    store.setDmAccessMode('whitelist');
    const logger = store.getDmLogger();

    return {
      embeds: [loggerPanel(ctx, 'Whitelist Mode Enabled', [
        '🧊 **Access mode switched to whitelist.**',
        '',
        ui.bullet([
          'Only users in the whitelist will have DM activity relayed/logged.',
          `Whitelisted users: \`${logger.whitelist?.length || 0}\``,
          'Use `@bot dm whitelist add <user id>` to grant access.',
          'Use `@bot dm whitelist list` to review access.'
        ])
      ], ICY.frost)]
    };
  }
});

/* ─── WHITELIST ADD ─────────────────────────────────────────────── */
registry.define({
  name: 'dm whitelist add',
  aliases: ['dm allow add', 'dm access add'],
  group: 'dmlogger',
  usage: '@bot dm whitelist add <id>',
  desc: 'Grant a user DM whitelist access',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isWhitelisted(userId)) {
      return { embeds: [ui.warn('Already Whitelisted', `<@${userId}> already has DM whitelist access.`)] };
    }

    store.whitelistAdd(userId);
    store.blacklistRemove(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [loggerPanel(ctx, 'Whitelist Access Granted', [
        ui.bullet([
          `**User:** ${user ? `**${user.tag}**` : `<@${userId}>`}  \`${userId}\``,
          'They can now be relayed/logged when DM whitelist mode is active.',
          'They were also removed from the blacklist if present.'
        ])
      ], ICY.success)]
    };
  }
});

/* ─── WHITELIST REMOVE ──────────────────────────────────────────── */
registry.define({
  name: 'dm whitelist remove',
  aliases: ['dm allow remove', 'dm access remove'],
  group: 'dmlogger',
  usage: '@bot dm whitelist remove <id>',
  desc: 'Revoke a user DM whitelist access',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (!store.isWhitelisted(userId)) {
      return { embeds: [ui.warn('Not Whitelisted', `<@${userId}> does not have DM whitelist access.`)] };
    }

    store.whitelistRemove(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [loggerPanel(ctx, 'Whitelist Access Revoked', [
        ui.bullet([
          `**User:** ${user ? `**${user.tag}**` : `<@${userId}>`}  \`${userId}\``,
          'In whitelist mode, this user will no longer be relayed/logged.'
        ])
      ], ICY.warn)]
    };
  }
});

/* ─── WHITELIST LIST ────────────────────────────────────────────── */
registry.define({
  name: 'dm whitelist list',
  aliases: ['dm whitelist', 'dm allow list', 'dm access list'],
  group: 'dmlogger',
  usage: '@bot dm whitelist list',
  desc: 'Show all users with DM whitelist access',
  async run({ ctx }) {
    const logger = store.getDmLogger();
    const lines = await userLines(ctx, logger.whitelist || []);
    const mode = logger.accessMode === 'whitelist' ? 'Whitelist mode is active' : 'Blacklist mode is active';

    return {
      embeds: [loggerPanel(ctx, `DM Whitelist (${logger.whitelist?.length || 0})`, [
        `**Mode:** \`${mode}\``,
        '',
        ...lines
      ], logger.accessMode === 'whitelist' ? ICY.frost : ICY.amber, {
        footer: `${logger.whitelist?.length || 0} whitelisted user(s) • DM Access Matrix`
      })]
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
            Relay:       logger.mode || 'not set',
            Access:      logger.accessMode === 'whitelist' ? 'whitelist only' : 'blacklist mode',
            Server:      guild ? guild.name : (logger.targetGuild || 'not set'),
            Category:    category ? category.name : (logger.targetCategory || 'not set'),
            Blacklisted: logger.blacklist?.length || 0,
            Whitelisted: logger.whitelist?.length || 0,
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
