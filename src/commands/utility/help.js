const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const emojis = {
  success: '✅',
  settings: '⚙️',
  search: '🔍',
  rocket: '🚀',
  premium: '👑',
  loading: '⏳',
  home: '🏠',
  file: '📁',
  error: '❌',
  commands: '📜'
};

module.exports = {

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all bot commands'),

  async execute(interaction, client) {

    const categories = {};

    client.commands.forEach(cmd => {

      const category =
        cmd.folder ||
        'other';

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(cmd);

    });

    const categoryEmojis = {
      utility: '📜',
      attendance: '📁',
      owner: '👑',
      other: '⚙️'
    };

    const options = Object.keys(categories).map(cat => ({

      label:
        cat.charAt(0).toUpperCase() +
        cat.slice(1),

      value: cat,

      emoji:
        categoryEmojis[cat] || '📂'

    }));

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(
        `${emojis.home} Icy Companion Help`
      )
      .setDescription([
        `${emojis.rocket} Welcome to **${client.user.username}**`,
        '',
        `${emojis.commands} Commands: \`${client.commands.size}\``,
        `${emojis.settings} Categories: \`${Object.keys(categories).length}\``,
        '',
        `${emojis.search} Select a category below`
      ].join('\n'))
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('Select category')
      .addOptions(options);

    const row = new ActionRowBuilder()
      .addComponents(menu);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });

  }
};