const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const HELP_CATEGORIES = [
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    color: 0x5865f2,
    description: 'Main help overview'
  },
  {
    id: 'attendance',
    label: 'Attendance',
    emoji: '📋',
    color: 0x57f287,
    description: 'Track and manage daily attendance.',
    commands: [
      { name: '/attendance', desc: 'Mark your attendance for today' },
      { name: '/attendance-log', desc: 'View recent attendance logs' },
      { name: '/attendance-reset', desc: 'Reset attendance and streaks' },
      { name: '/top-staff', desc: 'View the attendance streak leaderboard' },
      { name: '/set-staff-role', desc: 'Set the staff role' },
      { name: '/set-attendance-channel', desc: 'Set the attendance channel' }
    ]
  },
  {
    id: 'owner',
    label: 'Owner',
    emoji: '👑',
    color: 0xfee75c,
    description: 'Manage bot owners for this server.',
    commands: [
      { name: '/owner', desc: 'View the primary and extra owners' },
      { name: '/owner-list', desc: 'Alias of /owner' },
      { name: '/add-extra-owner', desc: 'Add an extra bot owner' },
      { name: '/remove-extra-owner', desc: 'Remove an extra bot owner' },
      { name: '/add-owner', desc: 'Alias of /add-extra-owner' },
      { name: '/remove-owner', desc: 'Alias of /remove-extra-owner' },
      { name: '/transfer-ownership', desc: 'Transfer primary ownership' }
    ]
  },
  {
    id: 'utility',
    label: 'Utility',
    emoji: '🛠️',
    color: 0x7dd3fc,
    description: 'General utility and fun commands.',
    commands: [
      { name: '/ping', desc: 'Check bot latency' },
      { name: '/uptime', desc: 'View bot uptime' },
      { name: '/server-info', desc: 'View server information' },
      { name: '/bot-info', desc: 'View bot information' },
      { name: '/user-info', desc: 'View user information' },
      { name: '/member-count', desc: 'View member statistics' },
      { name: '/help', desc: 'Open this help menu' },
      { name: '/reload', desc: 'Reload command files' }
    ]
  },
  {
    id: 'fun',
    label: 'Fun',
    emoji: '🎲',
    color: 0xf472b6,
    description: 'Games, randomisers and polls.',
    commands: [
      { name: '/avatar', desc: 'View a user avatar' },
      { name: '/coinflip', desc: 'Flip a coin' },
      { name: '/roll', desc: 'Roll a random number' },
      { name: '/8ball', desc: 'Ask the magic 8-ball' },
      { name: '/choose', desc: 'Choose between comma-separated options' },
      { name: '/poll', desc: 'Create a reaction poll' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    emoji: '⚙️',
    color: 0xa78bfa,
    description: 'Configure prefix and ignore lists.',
    commands: [
      { name: '/setprefix', desc: 'Change the text command prefix' },
      { name: '/ignore-role', desc: 'Toggle a role being ignored' },
      { name: '/ignore-user', desc: 'Toggle a user being ignored' },
      { name: '/ignore-channel', desc: 'Toggle a channel being ignored' },
      { name: '/ignore-list', desc: 'View everything being ignored' }
    ]
  }
];

function clampPage(index) {
  const numeric = Number(index);
  if (!Number.isInteger(numeric)) return 0;
  return Math.min(Math.max(numeric, 0), HELP_CATEGORIES.length - 1);
}

function botAvatar(client) {
  return client?.user?.displayAvatarURL?.() || null;
}

/**
 * Current text prefix for the footer. Falls back to '.' if the config
 * cannot be read (for example in DMs, where there is no guild).
 */
function guildPrefix(guild) {
  if (!guild?.id) return '.';

  try {
    // Required lazily to avoid a circular import at module load time.
    const { getServerConfig } = require('../../utils/configManager');
    return getServerConfig(guild.id).prefix || '.';
  } catch {
    return '.';
  }
}

function buildHelpEmbed(index, client, guild) {
  const page = clampPage(index);
  const category = HELP_CATEGORIES[page];
  const totalPages = HELP_CATEGORIES.length;
  const avatar = botAvatar(client);

  if (category.id === 'home') {
    const categories = HELP_CATEGORIES
      .slice(1)
      .map(cat => `> ${cat.emoji} **${cat.label}**\n> └ ${cat.description}`)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(category.color)
      .setAuthor({
        name: 'Icy Companion • Help Center',
        iconURL: avatar || undefined
      })
      .setTitle('❄️ Welcome to Icy Companion')
      .setDescription([
        'Premium Discord community utilities.',
        '',
        '### 📚 Help Categories',
        '',
        categories,
        '',
        '> Use the buttons or dropdown below to navigate.'
      ].join('\n'))
      .setFooter({
        text: `Page 1/${totalPages} • Current prefix: ${guildPrefix(guild)} • ${guild?.name || 'Direct Messages'}`
      })
      .setTimestamp();

    if (avatar) embed.setThumbnail(avatar);
    return embed;
  }

  const commands = (category.commands || [])
    .map(cmd => [`╭─ ✦ ${cmd.name}`, `╰─ ${cmd.desc}`].join('\n'))
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(category.color)
    .setAuthor({
      name: 'Icy Companion • Help Center',
      iconURL: avatar || undefined
    })
    .setTitle(`${category.emoji} ${category.label} Commands`)
    .setDescription([
      `> ${category.description}`,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      commands || 'No commands in this category yet.',
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '> Use the buttons below to navigate.'
    ].join('\n'))
    .setFooter({
      text: `Page ${page + 1}/${totalPages} • Current prefix: ${guildPrefix(guild)} • ${guild?.name || 'Icy Companion'}`
    })
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
}

/**
 * Visible loading state. Only ever shown if the silent acknowledgement
 * path fails - see src/utils/interactionResponder.js.
 */
function buildThinkingEmbed(client) {
  const avatar = botAvatar(client);

  const embed = new EmbedBuilder()
    .setColor(0x7dd3fc)
    .setAuthor({
      name: 'Icy Companion • Help Center',
      iconURL: avatar || undefined
    })
    .setTitle('❄️ Thinking...')
    .setDescription('> Fetching that page for you, one moment.')
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
}

/**
 * Same layout as the live components, but everything is disabled so the
 * user cannot queue up more clicks while a page is loading.
 */
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
      .setPlaceholder(`${HELP_CATEGORIES[page].emoji} ${HELP_CATEGORIES[page].label} • Select Category`)
      .addOptions(
        HELP_CATEGORIES.map((category, i) => ({
          label: category.label,
          value: String(i),
          emoji: category.emoji,
          description: category.description.slice(0, 100),
          default: i === page
        }))
      )
  );

  return [navigationRow, selectMenuRow];
}

module.exports = {
  HELP_CATEGORIES,
  buildHelpEmbed,
  buildHelpComponents,
  buildThinkingEmbed,
  buildDisabledComponents,
  clampPage
};
