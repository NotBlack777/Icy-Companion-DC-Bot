/**
 * ═══════════════════════════════════════════════════════════════════
 *   ICY COMPANION — Futuristic Help System
 *   Neon cyberpunk-inspired help panels
 * ═══════════════════════════════════════════════════════════════════
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

// ─── Icy Color Palette ─────────────────────────────────────────────
const ICY = {
  frost:    0x00d4ff,
  glacier:  0x0096c7,
  midnight: 0x0a1628,
  neon:     0x7df9ff,
  violet:   0x9b5de5,
  pink:     0xf72585,
  mint:     0x00f5d4,
  amber:    0xffd60a,
  lava:     0xff4d6d,
  success:  0x00f5a0,
  error:    0xff3d71,
  warn:     0xffaa00,
  info:     0x00c8ff,
  brand:    0x00c8ff,
};

// ─── Constants ─────────────────────────────────────────────────────
const GLOW = '═'.repeat(44);
const THIN = '─'.repeat(44);
const ACCENT = 0x00d4ff;

// ─── Categories ────────────────────────────────────────────────────
const HELP_CATEGORIES = [
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    color: ICY.frost,
    description: 'Main help overview — get started here'
  },
  {
    id: 'moderation',
    label: 'Moderation',
    emoji: '🛡️',
    color: ICY.violet,
    description: 'Moderation & management commands for server staff.',
    commands: [
      { name: '/role-info',       desc: 'View detailed info about a role' },
      { name: '/role-give',      desc: 'Give a role to a user' },
      { name: '/role-remove',    desc: 'Remove a role from a user' },
      { name: '/timeout-give',   desc: 'Apply a timeout to a user' },
      { name: '/timeout-remove', desc: 'Remove timeout from a user' },
      { name: '/mute',           desc: 'Server-mute a user' },
      { name: '/vc-move',        desc: 'Move a user between voice channels' },
      { name: '/warn',           desc: 'Issue a warning to a user' },
      { name: '/warnings',       desc: 'View a user\'s warning history' },
      { name: '/clear-warnings', desc: 'Clear all warnings from a user' },
      { name: '/soft-ban',      desc: 'Ban + unban to clear messages' },
      { name: '/ban',            desc: 'Ban a user from the server' },
      { name: '/unban',          desc: 'Unban a user by ID' },
      { name: '/kick',           desc: 'Kick a user from the server' },
      { name: '/tempban',        desc: 'Tempban with auto-unban timer' },
      { name: '/slowmode',       desc: 'Set channel slowmode delay' },
      { name: '/lock',           desc: 'Lock a channel' },
      { name: '/unlock',         desc: 'Unlock a channel' },
      { name: '/nuke',           desc: 'Clone + reset a channel' },
      { name: '/nick',           desc: "Change a user's nickname" },
      { name: '/purge',          desc: 'Bulk delete with 15+ filter types' },
      { name: '/purge-links',    desc: 'Quick-purge messages with links' },
      { name: '/purge-images',   desc: 'Quick-purge images/videos/audio' },
      { name: '/purge-bots',     desc: 'Quick-purge bot messages' },
      { name: '/purge-emojis',   desc: 'Quick-purge emoji/sticker messages' },
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    emoji: '📋',
    color: ICY.mint,
    description: 'Track and manage daily attendance.',
    commands: [
      { name: '/attendance',          desc: 'Mark your attendance for today' },
      { name: '/attendance-check',    desc: 'Check a user\'s attendance record' },
      { name: '/attendance-set',     desc: 'Manually set a user\'s attendance (staff)' },
      { name: '/attendance-remove',  desc: 'Remove a user\'s attendance record (staff)' },
      { name: '/attendance-history', desc: 'View a user\'s attendance history' },
      { name: '/attendance-log',     desc: 'View recent attendance logs' },
      { name: '/attendance-reset',   desc: 'Reset attendance and streaks' },
      { name: '/top-staff',         desc: 'View the attendance streak leaderboard' },
      { name: '/set-staff-role',    desc: 'Add/remove staff roles (multiple supported)' },
      { name: '/set-attendance-channel', desc: 'Set the attendance channel' }
    ]
  },
  {
    id: 'staff',
    label: 'Staff',
    emoji: '⭐',
    color: ICY.amber,
    description: 'Staff management commands.',
    commands: [
      { name: '/staff-add',        desc: 'Add a user to staff role(s)' },
      { name: '/staff-remove',     desc: 'Remove a user from staff role(s)' },
      { name: '/staff-list',       desc: 'List staff with attendance status' },
      { name: '/staff-info',       desc: 'Detailed info about a staff member' },
      { name: '/staff-add-user',   desc: 'Add user as virtual staff (no role)' },
      { name: '/staff-remove-user', desc: 'Remove user from virtual staff' },
      { name: '/staff-users',      desc: 'List all virtual staff members' },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    emoji: '📊',
    color: ICY.glacier,
    description: 'Attendance reports and analytics.',
    commands: [
      { name: '/report-today',     desc: 'Today\'s attendance report' },
      { name: '/report-inactive',  desc: 'Find inactive staff' },
      { name: '/leaderboard',      desc: 'Attendance streak leaderboard' },
    ]
  },
  {
    id: 'owner',
    label: 'Owner',
    emoji: '👑',
    color: ICY.amber,
    description: 'Manage bot owners for this server.',
    commands: [
      { name: '/owner',               desc: 'View the primary and extra owners' },
      { name: '/add-extra-owner',     desc: 'Add an extra bot owner' },
      { name: '/remove-extra-owner',   desc: 'Remove an extra bot owner' },
      { name: '/transfer-ownership',   desc: 'Transfer primary ownership' }
    ]
  },
  {
    id: 'utility',
    label: 'Utility',
    emoji: '🛠️',
    color: ICY.frost,
    description: 'General utility and fun commands.',
    commands: [
      { name: '/ping',         desc: 'Check bot latency' },
      { name: '/uptime',       desc: 'View bot uptime' },
      { name: '/server-info',  desc: 'View server information' },
      { name: '/bot-info',     desc: 'View bot information' },
      { name: '/user-info',    desc: 'View user information' },
      { name: '/member-count', desc: 'View member statistics' },
      { name: '/avatar',       desc: 'View a user avatar' },
      { name: '/help',         desc: 'Open this help menu' },
      { name: '/reload',       desc: 'Reload command files' }
    ]
  },
  {
    id: 'fun',
    label: 'Fun',
    emoji: '🎲',
    color: ICY.pink,
    description: 'Games, randomisers and polls.',
    commands: [
      { name: '/coinflip', desc: 'Flip a coin' },
      { name: '/roll',     desc: 'Roll a random number' },
      { name: '/8ball',    desc: 'Ask the magic 8-ball' },
      { name: '/choose',   desc: 'Choose between comma-separated options' },
      { name: '/poll',      desc: 'Create a reaction poll' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    emoji: '⚙️',
    color: ICY.glacier,
    description: 'Configure prefix, ignore lists, auto-mod, and colors.',
    commands: [
      { name: '/setprefix',        desc: 'Change the text command prefix' },
      { name: '/ignore-role',      desc: 'Toggle a role being ignored' },
      { name: '/ignore-user',      desc: 'Toggle a user being ignored' },
      { name: '/ignore-channel',   desc: 'Toggle a channel being ignored' },
      { name: '/ignore-list',      desc: 'View everything being ignored' },
      { name: '/set-automod',      desc: 'Configure auto-moderation filters' },
      { name: '/word-filter',      desc: 'Manage auto-mod word filter list' },
      { name: '/set-embed-colors', desc: 'Customize bot embed colors' },
      { name: '/set-mod-log',      desc: 'Set the mod log channel' },
      { name: '/set-purge-log',    desc: 'Set the purge log channel' },
      { name: '/set-warn-actions', desc: 'Auto-punish at warning thresholds' },
    ]
  }
];

// ─── Helpers ───────────────────────────────────────────────────────
function clampPage(index) {
  const numeric = Number(index);
  if (!Number.isInteger(numeric)) return 0;
  return Math.min(Math.max(numeric, 0), HELP_CATEGORIES.length - 1);
}

function botAvatar(client) {
  return client?.user?.displayAvatarURL?.() || null;
}

function guildPrefix(guild) {
  if (!guild?.id) return '.';
  try {
    const { getServerConfig } = require('../../utils/configManager');
    return getServerConfig(guild.id).prefix || '.';
  } catch {
    return '.';
  }
}

// ─── Home Page ─────────────────────────────────────────────────────
function buildHomePage(client, guild) {
  const avatar = botAvatar(client);
  const prefix = guildPrefix(guild);
  const totalCmds = HELP_CATEGORIES.slice(1).reduce((sum, c) => sum + (c.commands?.length || 0), 0);

  const embed = new EmbedBuilder()
    .setColor(ICY.frost)
    .setAuthor({
      name: '✦  I C Y   C O M P A N I O N',
      iconURL: avatar || undefined,
    })
    .setTitle('❄️  WELCOME TO ICY COMPANION')
    .setDescription([
      '```',
      '  ╔══════════════════════════════════════════════╗',
      '  ║     ❄  Premium Discord Utility Bot  ❄      ║',
      '  ║  Managing communities with precision ⚡     ║',
      '  ╚══════════════════════════════════════════════╝',
      '```',
      '',
      `> **${totalCmds}** commands across **${HELP_CATEGORIES.length - 1}** categories`,
      '',
      `  🔹 Bot Prefix  :  ${prefix}`,
      `  🔹 Slash Cmds  :  All commands available as /`,
      '',
      '',
      '━━━━━━━━━━━━━━━━━━ **CATEGORIES** ━━━━━━━━━━━━━━━━━━',
      '',
      ...HELP_CATEGORIES.slice(1).map(cat =>
        `>  **${cat.emoji}  ${cat.label}**\n>  └  ${cat.description}`
      ),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '>  Navigate using the **buttons** or **dropdown menu** below.'
    ].join('\n'))
    .setFooter({
      text: `Page 1/${HELP_CATEGORIES.length}  •  ${guild?.name || 'Direct Messages'}`
    })
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
}

// ─── Category Page ─────────────────────────────────────────────────
function buildCategoryPage(category, page, total, avatar) {
  const commands = category.commands || [];

  const cmdBlocks = commands.map(cmd =>
    `  ┌─ **${cmd.name}**\n  │  ${cmd.desc}\n  └────────────────────────`
  );

  const embed = new EmbedBuilder()
    .setColor(category.color || ICY.frost)
    .setAuthor({
      name: '✦  I C Y   C O M P A N I O N',
      iconURL: avatar || undefined,
    })
    .setTitle(`${category.emoji}  ${category.label.toUpperCase()}  ✦`)
    .setDescription([
      '```',
      `  ${category.description}`,
      '```',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      cmdBlocks.length ? cmdBlocks.join('\n') : '  No commands in this category.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  🔹 ${commands.length} command${commands.length !== 1 ? 's' : ''} in this category`,
      `  🔹 Use / to access any command directly`,
      '',
      '>  Navigate using the **buttons** or **dropdown menu** below.'
    ].join('\n'))
    .setFooter({
      text: `Page ${page + 1}/${total}  •  Use / for commands`
    })
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
}

// ─── Build Embed ───────────────────────────────────────────────────
function buildHelpEmbed(index, client, guild) {
  const page = clampPage(index);
  const category = HELP_CATEGORIES[page];
  const totalPages = HELP_CATEGORIES.length;
  const avatar = botAvatar(client);

  if (category.id === 'home') {
    return buildHomePage(client, guild);
  }

  return buildCategoryPage(category, page, totalPages, avatar);
}

// ─── Thinking Embed ────────────────────────────────────────────────
function buildThinkingEmbed(client) {
  const avatar = botAvatar(client);

  const embed = new EmbedBuilder()
    .setColor(ICY.frost)
    .setAuthor({
      name: '✦  I C Y   C O M P A N I O N',
      iconURL: avatar || undefined,
    })
    .setTitle('❄️  Loading...')
    .setDescription([
      '```',
      '  ⏳  Fetching your command panel...',
      '  ░░░░░░░░░░░░░░░░░░░░░░░░░',
      '```',
      '',
      '>  Please hold, icy one. ❄️'
    ].join('\n'))
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
}

// ─── Components ────────────────────────────────────────────────────
function buildDisabledComponents(index) {
  return buildHelpComponents(index).map(row => {
    const clone = ActionRowBuilder.from(row);
    clone.components.forEach(component => component.setDisabled(true));
    return clone;
  });
}

function buildHelpComponents(index) {
  const page = clampPage(index);
  const totalPages = HELP_CATEGORIES.length;

  const navigationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_first')
      .setEmoji('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('help_previous')
      .setEmoji('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('help_home')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Success)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setEmoji('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages - 1),
    new ButtonBuilder()
      .setCustomId('help_last')
      .setEmoji('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages - 1)
  );

  const selectMenuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder(`❄ ${HELP_CATEGORIES[page].label} — Select Category`)
      .addOptions(
        HELP_CATEGORIES.map((cat, i) => ({
          label:   cat.label,
          value:   String(i),
          emoji:   cat.emoji,
          description: cat.description.slice(0, 80),
          default: i === page
        }))
      )
  );

  return [navigationRow, selectMenuRow];
}

// ─── Exports ───────────────────────────────────────────────────────
module.exports = {
  HELP_CATEGORIES,
  buildHelpEmbed,
  buildHelpComponents,
  buildThinkingEmbed,
  buildDisabledComponents,
  clampPage
};
