/**
 * /nick — Change a user's nickname
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a user\'s nickname')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false).setMaxLength(32)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname') || null;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not in Server').setDescription(`${user} is not a member of this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.manageable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Change Nickname').setDescription(`Cannot change **${user.tag}**'s nickname — they may have a higher role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const previous = member.nickname || user.username;

    try {
      await member.setNickname(nickname, `[Nick] By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const action = nickname ? 'Changed' : 'Reset';

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle(`✏️ Nickname ${action}`)
        .setDescription([
          `**User:** ${user}`,
          `**Previous:** \`${previous}\``,
          nickname ? `**New:** \`${nickname}\`` : '**New:** _reset to username_',
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    });
  }
};
