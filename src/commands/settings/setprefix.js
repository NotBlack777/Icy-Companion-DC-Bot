const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Change the text command prefix for this server')
    .addStringOption(option =>
      option
        .setName('prefix')
        .setDescription('New prefix (1-5 characters), e.g. . or !')
        .setRequired(true)
        .setMaxLength(5)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const prefix = interaction.options.getString('prefix').trim();

    if (!prefix) {
      return interaction.reply({
        content: '❌ The prefix cannot be empty.',
        ephemeral: true
      });
    }

    if (/\s/.test(prefix)) {
      return interaction.reply({
        content: '❌ The prefix cannot contain spaces.',
        ephemeral: true
      });
    }

    const previous = config.prefix || '.';
    config.prefix = prefix;
    saveServerConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Prefix Updated')
      .setDescription([
        `> **New prefix:** \`${prefix}\``,
        `> **Previous:** \`${previous}\``,
        '',
        `Example: \`${prefix}help\``
      ].join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
