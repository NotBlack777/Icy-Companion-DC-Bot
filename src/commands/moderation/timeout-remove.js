/**
 * /timeout-remove — Remove a timeout from a user
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('timeout-remove')
    .setDescription('Remove a timeout from a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),

  async execute(interaction) {
    const user   = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Member Not Found').setDescription(`**${user.tag}** is not in this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Active Timeout').setDescription(`${user} does not have an active timeout.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await member.disableCommunicationUntil(null, `[Timeout Remove] By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Failed').setDescription(`Could not remove timeout from **${user.tag}**.\n> \`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Timeout Removed')
        .setDescription([
          `**User:** ${user} (\`${user.id}\`)`,
          `**By:** ${interaction.user}`,
          '',
          '⏱️ The user can now send messages again.',
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
