const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');
const { createEmbed, e, infoEmbed, successEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'attendance',
  data: new SlashCommandBuilder()
    .setName('set-attendance-channel')
    .setDescription('Set the channel where attendance can be marked')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Attendance channel (leave empty to clear)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const channel = interaction.options.getChannel('channel');
    const previous = config.attendanceChannel;

    if (!channel) {
      config.attendanceChannel = null;
      saveServerConfig(interaction.guild.id, config);
      return interaction.reply({
        embeds: [infoEmbed(previous 
          ? `Attendance channel cleared. Removed: <#${previous}>` 
          : 'No attendance channel was set.')]
      });
    }

    const me = interaction.guild.members.me;
    const perms = channel.permissionsFor(me);
    const missing = [];
    if (!perms?.has(PermissionFlagsBits.ViewChannel)) missing.push('View Channel');
    if (!perms?.has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages');
    if (!perms?.has(PermissionFlagsBits.EmbedLinks)) missing.push('Embed Links');

    if (missing.length) {
      return interaction.reply({
        content: `❌ I need these permissions in ${channel}: ${missing.map(p => `**${p}**`).join(', ')}`,
        ephemeral: true
      });
    }

    config.attendanceChannel = channel.id;
    saveServerConfig(interaction.guild.id, config);

    const embed = createEmbed({
      color: 0x00f5a0,
      author: { name: 'Configuration Updated', iconURL: interaction.guild.iconURL() || undefined },
      description: `### ${e('settings')} Attendance Channel Set\n` +
                   `> **Active Channel:** ${channel}\n` +
                   (previous && previous !== channel.id ? `> **Previous:** <#${previous}>\n` : '') +
                   `\n*Attendance command is now restricted to this channel.*`,
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
