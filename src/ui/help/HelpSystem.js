// src/ui/help/helpSystem.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const HELP_CATEGORIES = [
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    color: 0x5865f2,
  },

  {
    id: 'attendance',
    label: 'Attendance',
    emoji: '📋',
    color: 0x57f287,
    description: 'Track and manage daily attendance.',
    commands: [
      { name: '/attendance', desc: 'Mark your attendance for today' },
      { name: '/attendance-late', desc: 'Mark attendance as late' },
      { name: '/attendance-log', desc: 'View attendance logs' },
      { name: '/attendance-status', desc: 'View attendance status' },
      { name: '/attendance-reset', desc: 'Reset today attendance' },
      { name: '/attendance-history', desc: 'View attendance history' },
      { name: '/attendance-percentage', desc: 'View attendance rates' },
      { name: '/attendance-export', desc: 'Export attendance CSV' },
    ],
  },

  {
    id: 'streaks',
    label: 'Streaks',
    emoji: '🔥',
    color: 0xff9900,
    description: 'Manage attendance streak systems.',
    commands: [
      { name: '/attendance-streak', desc: 'View current streak' },
      { name: '/set-streak', desc: 'Set user streak' },
      { name: '/set-streak-all', desc: 'Set all streaks' },
      { name: '/set-streak-others', desc: 'Set others streaks' },
      { name: '/add-streak', desc: 'Add streak days' },
      { name: '/add-streak-all', desc: 'Add all streak days' },
      { name: '/add-streak-others', desc: 'Add others streak days' },
    ],
  },

  {
    id: 'rankings',
    label: 'Rankings',
    emoji: '🏆',
    color: 0xf1c40f,
    description: 'Staff rankings and leaderboards.',
    commands: [
      { name: '/top-staff', desc: 'View top attendance staff' },
      { name: '/leaderboard', desc: 'View streak leaderboard' },
    ],
  },

  {
    id: 'excuses',
    label: 'Excuses',
    emoji: '🙏',
    color: 0xeb459e,
    description: 'Manage attendance excuses.',
    commands: [
      { name: '/excuse', desc: 'Submit an excuse' },
      { name: '/excuse-list', desc: 'View all excuses' },
      { name: '/excuse-remove', desc: 'Remove an excuse' },
    ],
  },

  {
    id: 'reminders',
    label: 'Reminders',
    emoji: '🔔',
    color: 0x00b0f4,
    description: 'Attendance reminder system.',
    commands: [
      { name: '/remind', desc: 'Send attendance reminder' },
      { name: '/remind-all', desc: 'Remind all staff' },
      { name: '/remind-user', desc: 'Remind specific user' },
      { name: '/set-remind-time', desc: 'Set auto reminder time' },
      { name: '/remind-permission', desc: 'Manage remind perms' },
      { name: '/remind-permission-list', desc: 'View remind perms' },
    ],
  },

  {
    id: 'settings',
    label: 'Settings',
    emoji: '⚙️',
    color: 0x99aab5,
    description: 'Server and bot configuration.',
    commands: [
      { name: '/setprefix', desc: 'Change bot prefix' },
      { name: '/set-staff-role', desc: 'Set staff role' },
      { name: '/view-staff-role', desc: 'View staff role' },
      { name: '/set-attendance-channel', desc: 'Set log channel' },
      { name: '/view-attendance-channel', desc: 'View log channel' },
      { name: '/remove-attendance-channel', desc: 'Remove log channel' },
      { name: '/ignore-role', desc: 'Ignore a role' },
      { name: '/unignore-role', desc: 'Unignore a role' },
      { name: '/ignore-user', desc: 'Ignore a user' },
      { name: '/unignore-user', desc: 'Unignore a user' },
      { name: '/ignore-channel', desc: 'Ignore a channel' },
      { name: '/unignore-channel', desc: 'Unignore a channel' },
      { name: '/ignore-list', desc: 'View ignored list' },
      { name: '/config-info', desc: 'View server config' },
    ],
  },

  {
    id: 'owner',
    label: 'Owner',
    emoji: '👑',
    color: 0xfee75c,
    description: 'Ownership and permissions.',
    commands: [
      { name: '/add-owner', desc: 'Add owner' },
      { name: '/remove-owner', desc: 'Remove owner' },
      { name: '/owner', desc: 'View owner' },
      { name: '/owner-list', desc: 'View owners' },
      { name: '/add-extra-owner', desc: 'Add extra owner' },
      { name: '/remove-extra-owner', desc: 'Remove extra owner' },
      { name: '/transfer-ownership', desc: 'Transfer ownership' },
    ],
  },

  {
    id: 'staff',
    label: 'Staff',
    emoji: '📢',
    color: 0x3ba55d,
    description: 'Staff management commands.',
    commands: [
      { name: '/staff-list', desc: 'View staff members' },
      { name: '/announce', desc: 'Send announcement embed' },
    ],
  },

  {
    id: 'utility',
    label: 'Utility',
    emoji: '🛠️',
    color: 0xed4245,
    description: 'General utility and fun commands.',
    commands: [
      { name: '/ping', desc: 'Check bot latency' },
      { name: '/uptime', desc: 'View uptime' },
      { name: '/server-info', desc: 'View server info' },
      { name: '/bot-info', desc: 'View bot info' },
      { name: '/user-info', desc: 'View user info' },
      { name: '/member-count', desc: 'View member count' },
      { name: '/avatar', desc: 'View avatar' },
      { name: '/coinflip', desc: 'Flip a coin' },
      { name: '/roll', desc: 'Roll dice' },
      { name: '/8ball', desc: 'Ask the 8ball' },
      { name: '/choose', desc: 'Random choice' },
      { name: '/poll', desc: 'Create a poll' },
      { name: '/afk', desc: 'Set AFK status' },
      { name: '/help', desc: 'Open help menu' },
    ],
  },
];

function buildHelpEmbed(index, client, guild) {

  const category = HELP_CATEGORIES[index];

  const totalPages = HELP_CATEGORIES.length;

  if (category.id === 'home') {

    const categories = HELP_CATEGORIES
      .slice(1)
      .map(cat =>
        `> ${cat.emoji} **${cat.label}**\n> └ ${cat.description}`
      )
      .join('\n\n');

    return new EmbedBuilder()

      .setColor(0x5865f2)

      .setAuthor({
        name: 'Icy Companion • Premium Help Center',
        iconURL: client.user.displayAvatarURL(),
      })

      .setTitle('❄️ Welcome to Icy Companion')

      .setDescription([
        '╭──────────────────────╮',
        '  Premium Discord Management',
        '╰──────────────────────╯',
        '',
        '> Modern attendance system',
        '> Premium help navigation',
        '> Advanced staff utilities',
        '> Optimized for communities',
        '',
        '### 📚 Help Categories',
        '',
        categories,
      ].join('\n'))

      .setThumbnail(client.user.displayAvatarURL())

      .setImage('https://i.imgur.com/AfFp7pu.png')

      .setFooter({
        text: `Page 1/${totalPages} • ${guild?.name || 'Direct Messages'}`,
      })

      .setTimestamp();
  }

  const commands = category.commands
    .map(cmd => {

      return [
        `╭─ ✦ ${cmd.name}`,
        `╰─ ${cmd.desc}`,
      ].join('\n');

    })
    .join('\n\n');

  return new EmbedBuilder()

    .setColor(category.color)

    .setAuthor({
      name: 'Icy Companion • Premium Help Center',
      iconURL: client.user.displayAvatarURL(),
    })

    .setTitle(`${category.emoji} ${category.label} Commands`)

    .setDescription([
      `> ${category.description}`,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      commands,
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '> Use the buttons below to navigate',
    ].join('\n'))

    .setThumbnail(client.user.displayAvatarURL())

    .setImage('https://i.imgur.com/AfFp7pu.png')

    .setFooter({
      text: `Page ${index + 1}/${totalPages} • Icy Companion`,
    })

    .setTimestamp();
}

function buildHelpComponents(index) {

  const totalPages = HELP_CATEGORIES.length;

  const navigationRow = new ActionRowBuilder()

    .addComponents(

      new ButtonBuilder()
        .setCustomId('help_first')
        .setEmoji('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),

      new ButtonBuilder()
        .setCustomId('help_previous')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),

      new ButtonBuilder()
        .setCustomId('help_home')
        .setEmoji('🏠')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('help_next')
        .setEmoji('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === totalPages - 1),

      new ButtonBuilder()
        .setCustomId('help_last')
        .setEmoji('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === totalPages - 1),
    );

  const selectMenuRow = new ActionRowBuilder()

    .addComponents(

      new StringSelectMenuBuilder()

        .setCustomId('help_select')

        .setPlaceholder(
`${HELP_CATEGORIES[index].emoji} ${HELP_CATEGORIES[index].label} • Select Category`
        )

        .addOptions(

          HELP_CATEGORIES.map((category, i) => ({

            label: category.label,

            value: String(i),

            emoji: category.emoji,

            description:
category.id === 'home'
? 'Main help overview'
: category.description.slice(0, 50),

            default: i === index,
          }))
        )
    );

  return [
    navigationRow,
    selectMenuRow,
  ];
}

module.exports = {
  HELP_CATEGORIES,
  buildHelpEmbed,
  buildHelpComponents,
};