/**
 * /timeout-give — Apply a timeout (communication disabled) to a user
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('timeout-give')
    .setDescription('Apply a timeout to a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason (optional)')),

  async execute(interaction) {
    const user     = interaction.options.getUser('user');
    const minutes  = interaction.options.getInteger('minutes');
    const reason   = interaction.options.getString('reason') || 'No reason provided';

    if (minutes < 1 || minutes > 40320) { // max 28 days
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Invalid Duration').setDescription('Timeout must be between **1** and **40320** minutes (28 days).').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Member Not Found').setDescription(`**${user.tag}** is not in this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.manageable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Timeout').setDescription(`The bot cannot timeout **${member.user.tag}** — they may have a higher role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const duration = new Date(Date.now() + minutes * 60 * 1000);

    try {
      await member.disableCommunicationUntil(duration, `[Timeout] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Timeout Failed').setDescription(`Could not timeout **${user.tag}**.\n> \`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '⏱️ Timeout Applied', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⏱️ User Timed Out')
        .setDescription([
          `**User:** ${user} (\`${user.id}\`)`,
          `**Duration:** \`${minutes}\` minute${minutes!==1?'s':''}`,
          `**Until:** <t:${Math.floor(duration.getTime()/1000)}:F>`,
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
