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
      { name: '/attendance-reset', desc: 'Reset attendance and streaks' }
    ]
  },
  {
    id: 'owner',
    label: 'Owner',
    emoji: '👑',
    color: 0xfee75c,
    description: 'Manage bot owners for this server.',
    commands: [
      { name: '/add-owner', desc: 'Add an extra bot owner' },
      { name: '/remove-owner', desc: 'Remove an extra bot owner' },
      { name: '/owner-list', desc: 'View the primary and extra owners' },
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
      { name: '/help', desc: 'Open this help menu' },
      { name: '/ping', desc: 'Check bot latency' },
      { name: '/uptime', desc: 'View bot uptime' },
      { name: '/botinfo', desc: 'View bot information' },
      { name: '/serverinfo', desc: 'View server information' },
      { name: '/userinfo', desc: 'View user information' },
      { name: '/membercount', desc: 'View member statistics' },
      { name: '/avatar', desc: 'View a user avatar' },
      { name: '/coinflip', desc: 'Flip a coin' },
      { name: '/roll', desc: 'Roll a random number' },
      { name: '/8ball', desc: 'Ask the magic 8-ball' },
      { name: '/choose', desc: 'Choose between comma-separated options' },
      { name: '/reload', desc: 'Reload command files' }
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
        text: `Page 1/${totalPages} • ${guild?.name || 'Direct Messages'}`
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
      text: `Page ${page + 1}/${totalPages} • Icy Companion`
    })
    .setTimestamp();

  if (avatar) embed.setThumbnail(avatar);
  return embed;
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
  clampPage
};
