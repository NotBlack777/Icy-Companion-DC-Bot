const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard, isGuildOwner } = require('../../utils/guildAuth');

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('ignore-user')
    .setDescription('Toggle whether a user is ignored by the bot')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ignore or un-ignore')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const user = interaction.options.getUser('user');

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ You cannot ignore yourself.',
        ephemeral: true
      });
    }

    // Protect owners from being locked out of their own bot.
    const targetIsOwner =
      user.id === interaction.guild.ownerId ||
      isGuildOwner(config, { user, guild: interaction.guild, member: null });

    if (targetIsOwner) {
      return interaction.reply({
        content: '❌ You cannot ignore a server or bot owner.',
        ephemeral: true
      });
    }

    config.ignoreUsers = Array.isArray(config.ignoreUsers) ? config.ignoreUsers : [];

    const wasIgnored = config.ignoreUsers.includes(user.id);

    config.ignoreUsers = wasIgnored
      ? config.ignoreUsers.filter(id => id !== user.id)
      : [...config.ignoreUsers, user.id];

    saveServerConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
      .setColor(wasIgnored ? 0x57f287 : 0xed4245)
      .setTitle(wasIgnored ? '✅ User Un-ignored' : '🚫 User Ignored')
      .setDescription([
        `> **User:** ${user} (\`${user.tag}\`)`,
        wasIgnored
          ? '> They can use the bot again.'
          : '> They can no longer use bot commands.',
        '',
        `> **Total ignored users:** \`${config.ignoreUsers.length}\``
      ].join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
