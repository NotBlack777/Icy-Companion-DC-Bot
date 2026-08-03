/**
 * /mute — Mute a user (server mute + optional timeout)
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user in all voice channels')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes (optional)').setMinValue(1).setMaxValue(40320))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason (optional)')),

  async execute(interaction) {
    const user    = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason  = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Member Not Found').setDescription(`**${user.tag}** is not in this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Apply server mute
    try {
      await member.voice.setMute(true, `[Mute] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Mute Failed').setDescription(`Could not mute **${user.tag}**.\n> \`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Also apply a timeout if duration was specified
    if (minutes) {
      const duration = new Date(Date.now() + minutes * 60 * 1000);
      try {
        await member.disableCommunicationUntil(duration, `[Mute] ${reason} — By ${interaction.user.tag}`);
      } catch { /* Non-fatal — voice mute still applied */ }
    }

    const durationLine = minutes
      ? `**Duration:** \`${minutes}\` minute${minutes!==1?'s':''}`
      : '**Duration:** indefinite (until manually unmuted)';

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '🔇 User Muted', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔇 User Muted')
        .setDescription([
          `**User:** ${user} (\`${user.id}\`)`,
          durationLine,
          `**Reason:** ${reason}`,
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
