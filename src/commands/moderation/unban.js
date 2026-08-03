/**
 * /unban — Unban a user from the server
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(opt => opt.setName('user-id').setDescription('User ID to unban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the unban').setRequired(false)),

  async execute(interaction) {
    const userId = interaction.options.getString('user-id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Validate it looks like a user ID
    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid ID').setDescription('Please provide a valid Discord user ID (17-20 digits).').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Check if actually banned
    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not Banned').setDescription(`User \`${userId}\` is not banned from this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }
    } catch {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Error').setDescription('Could not check ban list.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await interaction.guild.bans.remove(userId, `[Unban] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Unban Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ User Unbanned')
        .setDescription([
          `**User ID:** \`${userId}\``,
          `**Reason:** ${reason}`,
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    });
  }
};
