const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('set-attendance-channel')
    .setDescription('Set the channel where attendance can be marked')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Attendance channel (leave empty to clear)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const channel = interaction.options.getChannel('channel');
    const previous = config.attendanceChannel;

    if (!channel) {
      config.attendanceChannel = null;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('🧹 Attendance Channel Cleared')
          .setDescription(
            previous
              ? `> Removed: <#${previous}>\n> Attendance can be marked in any channel now.`
              : '> No attendance channel was set.'
          )
          .setTimestamp()]
      });
    }

    // Verify the bot can actually post there before saving.
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

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Attendance Channel Set')
      .setDescription([
        `> **Channel:** ${channel}`,
        previous && previous !== channel.id ? `> **Previous:** <#${previous}>` : null,
        '',
        '> Attendance reminders and logs will use this channel.'
      ].filter(Boolean).join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
