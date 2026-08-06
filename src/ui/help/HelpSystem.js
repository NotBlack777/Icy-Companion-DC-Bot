/**
 * ═══════════════════════════════════════════════════════════════════
 *   ICY COMPANION — Sleek Help System
 *   Clean Moonveil-inspired help panels
 * ═══════════════════════════════════════════════════════════════════
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');
const { createColorProxy } = require('../../utils/themeManager');

// ─── Icy Color Palette ─────────────────────────────────────────────
const ICY = createColorProxy();

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
      { name: '/owner-list',           desc: 'View the primary and server owners', aliases: ['/owner'] },
      { name: '/add-owner',            desc: 'Add a server bot owner', aliases: ['/add-extra-owner'] },
      { name: '/remove-owner',         desc: 'Remove a server bot owner', aliases: ['/remove-extra-owner'] },
      { name: '/transfer-ownership',   desc: 'Transfer primary server ownership' }
    ]
  },
  {
    id: 'dm-control',
    label: 'Owner DM',
    emoji: '📨',
    color: ICY.orange,
    description: 'Owner-only @bot commands used in DMs or by mentioning the bot.',
    examples: [
      '`@bot massdm #1 --dry-run --limit 10 Hello team!`',
      '`@bot massdm #1 --yes --plain --delay 1500 Hello everyone!`',
      '`@bot theme test #00D4FF #FB8500 #38BDF8`',
      '`@bot dm whitelist list`'
    ],
    commands: [
      { name: '@bot massdm', desc: 'Mass DM members in one server with progress + rate delay. Needs --yes to actually send.', aliases: ['mass dm', 'dm all', 'dmall', 'mass-dm'], example: '@bot massdm #1 --dry-run --limit 10 Hello!' },
      { name: '@bot broadcast', desc: 'Post an announcement to a sendable channel in every server', aliases: ['bc'], example: '@bot broadcast Maintenance starts soon.' },
      { name: '@bot announce', desc: 'Post an announcement in a specific channel', example: '@bot announce #1 123456789012345678 Hello!' },
      { name: '@bot dm', desc: 'Send a plain direct message to one user', example: '@bot dm 773827814267813928 hello' },
      { name: '@bot theme', desc: 'Show/apply/test/save custom UI themes', aliases: ['themes', 'theme presets', 'set theme', 'theme preview'], example: '@bot theme save orange-sky #00D4FF #FB8500 #38BDF8' },
      { name: '@bot dm mode whitelist', desc: 'Only relay/log whitelisted DM users', aliases: ['dm access whitelist', 'dm whitelist mode'] },
      { name: '@bot dm whitelist add', desc: 'Grant a user DM whitelist access', aliases: ['dm allow add', 'dm access add'] },
      { name: '@bot serverowner add', desc: 'Add a server bot owner from DMs', aliases: ['addserverowner', 'server-owner-add'] },
      { name: '@bot health', desc: 'Check uptime, memory, theme and DM logger status', aliases: ['system', 'diagnostics'] },
      { name: '@bot exportconfig', desc: 'Export server config backup JSON', aliases: ['config export', 'backupconfig'] },
      { name: '@bot importconfig', desc: 'Restore a config backup from JSON', aliases: ['config import', 'restoreconfig'] }
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
      { name: '/health',       desc: 'View bot health and runtime status' },
      { name: '/uptime',       desc: 'View bot uptime' },
      { name: '/server-info',  desc: 'View server information', aliases: ['/serverinfo'] },
      { name: '/bot-info',     desc: 'View bot information', aliases: ['/botinfo'] },
      { name: '/user-info',    desc: 'View user information', aliases: ['/userinfo'] },
      { name: '/member-count', desc: 'View member statistics', aliases: ['/membercount'] },
      { name: '/avatar',         desc: 'View a user avatar or PFP' },
      { name: '/pfp',             desc: 'View a user profile picture' },
      { name: '/banner',          desc: 'View a user profile banner' },
      { name: '/gif-banner',      desc: 'Get an animated banner when available' },
      { name: '/profile-assets',  desc: 'View a user PFP, banner and download links' },
      { name: '/import-emojis',    desc: 'Import custom UI emojis from this server (Owner)' },
      { name: '/help',         desc: 'Open this help menu' },
      { name: '/reload',       desc: 'Reload command files' },
      { name: '/store-emoji',  desc: 'Store custom emojis (Owner)' }
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
      { name: '/theme',            desc: 'Set or preview this server theme override', example: '/theme set name:sunset-ice' },
      { name: '/maintenance',      desc: 'Disable modules or individual commands with a maintenance note', example: '/maintenance command command:ban enabled:true note:Updating ban logs' },
      { name: '/rate-limit',       desc: 'Set, view, or turn off per-command cooldowns', example: '/rate-limit set enabled:true seconds:5' },
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

function formatAliasList(aliases = []) {
  return aliases.length ? `\n> **Aliases:** ${aliases.map(alias => `\`${alias}\``).join(', ')}` : '';
}

function formatExample(example) {
  return example ? `\n> **Example:** \`${example}\`` : '';
}

function commandRow(command) {
  return [
    `**${command.name}** — ${command.desc}`,
    formatAliasList(command.aliases),
    formatExample(command.example)
  ].filter(Boolean).join('');
}

function chunkRows(rows, limit = 900) {
  const chunks = [];
  let current = '';

  for (const row of rows) {
    const next = current ? `${current}\n\n${row}` : row;
    if (next.length > limit && current) {
      chunks.push(current);
      current = row;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : ['_No commands in this category yet._'];
}

// ─── Home Page ─────────────────────────────────────────────────────
function buildHomePage(client, guild) {
  const avatar = botAvatar(client);
  const prefix = guildPrefix(guild);
  const totalCmds = HELP_CATEGORIES.slice(1).reduce((sum, c) => sum + (c.commands?.length || 0), 0);
  const categories = HELP_CATEGORIES.slice(1);
  const quickStart = [
    `**Public help:** \`/help\``,
    `**Bot mention:** \`@bot\``,
    `**Owner controls:** DM me \`@bot help\``,
    `**Mass DM test:** \`@bot massdm #1 --dry-run --limit 10 Hello!\``
  ].join('\n');

  const categoryFields = chunkRows(
    categories.map(category => `${category.emoji} **${category.label}** — ${category.description}  \`${category.commands?.length || 0}\``),
    950
  ).map((chunk, index) => ({
    name: index === 0 ? 'Pick a lane' : 'More lanes',
    value: chunk,
    inline: false
  }));

  return createEmbed({
    author: { name: '🌅 ICY COMPANION • EASY HELP', iconURL: avatar || undefined },
    title: `${e('rocket') || '🚀'} Help, but chill`,
    description: [
      '**No war manual. Just pick a category from the dropdown.**',
      '',
      `> ${e('commands')} **${totalCmds}** commands • ${e('settings')} **${HELP_CATEGORIES.length - 1}** sections • Prefix \`${prefix}\``,
      '',
      quickStart
    ].join('\n'),
    fields: categoryFields,
    footer: { text: `Page 1/${HELP_CATEGORIES.length} • ${guild?.name || 'Direct Messages'} • Dropdown below` },
    thumbnail: avatar,
    color: ICY.frost,
    compact: true
  });
}

// ─── Category Page ─────────────────────────────────────────────────
function buildCategoryPage(category, page, total, avatar) {
  const commands = category.commands || [];
  const rows = commands.map(commandRow);
  const commandFields = chunkRows(rows, 930).slice(0, 20).map((chunk, index) => ({
    name: index === 0 ? 'Commands' : 'More commands',
    value: chunk,
    inline: false
  }));

  if (Array.isArray(category.examples) && category.examples.length) {
    commandFields.push({
      name: 'Copy-paste examples',
      value: category.examples.map(example => `> ${example}`).join('\n'),
      inline: false
    });
  }

  return createEmbed({
    author: { name: '🌅 ICY COMPANION • EASY HELP', iconURL: avatar || undefined },
    title: `${category.emoji} ${category.label}`,
    description: [
      `**${category.description}**`,
      `> ${commands.length} command${commands.length === 1 ? '' : 's'} shown with aliases/examples where useful.`
    ].join('\n'),
    fields: commandFields,
    footer: { text: `Page ${page + 1}/${total} • Use dropdown/buttons • Owner DM tools use @bot` },
    thumbnail: avatar,
    color: category.color || ICY.frost,
    compact: true
  });
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

  return createEmbed({
    author: { name: 'ICY COMPANION', iconURL: avatar || undefined },
    description: `${e('loading')} **Fetching your command panel...**`,
    color: ICY.frost
  });
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
