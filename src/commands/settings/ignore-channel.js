const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('ignore-channel')
    .setDescription('Toggle whether a channel is ignored by the bot')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to ignore or un-ignore (defaults to here)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const channel = interaction.options.getChannel('channel') || interaction.channel;

    config.ignoreChannels = Array.isArray(config.ignoreChannels) ? config.ignoreChannels : [];

    const wasIgnored = config.ignoreChannels.includes(channel.id);

    config.ignoreChannels = wasIgnored
      ? config.ignoreChannels.filter(id => id !== channel.id)
      : [...config.ignoreChannels, channel.id];

    saveServerConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
      .setColor(wasIgnored ? 0x57f287 : 0xed4245)
      .setTitle(wasIgnored ? '✅ Channel Un-ignored' : '🚫 Channel Ignored')
      .setDescription([
        `> **Channel:** ${channel}`,
        wasIgnored
          ? '> Commands work here again.'
          : '> Commands are disabled in this channel.',
        '',
        `> **Total ignored channels:** \`${config.ignoreChannels.length}\``
      ].join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
