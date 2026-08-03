/**
 * /ban — Ban a user from the server
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to delete (0-7)').setRequired(false).setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 1;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Ban').setDescription(`Cannot ban **${user.tag}** — they may have a higher role or the bot lacks permissions.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Try to DM the user before banning
    if (member) {
      try {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor(ICY.lava)
            .setTitle(`🔨 You have been banned — ${interaction.guild.name}`)
            .setDescription(`**Reason:** ${reason}\n\nIf you believe this was a mistake, contact the server staff.`)
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ]
        }).catch(() => {});
      } catch {}
    }

    try {
      await interaction.guild.bans.create(user.id, {
        deleteMessageSeconds: days * 86400,
        reason: `[Ban] ${reason} — By ${interaction.user.tag}`
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Ban Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.lava)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔨 User Banned')
        .setDescription([
          '```',
          `  ╭─ Ban`,
          `  │  User   : ${user.tag}`,
          `  │  ID     : ${user.id}`,
          `  │  Reason : ${reason}`,
          `  │  Msgs   : ${days} day(s) deleted`,
          `  │  By     : ${interaction.user.tag}`,
          `  ╰────────────────────────`,
          '```',
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    });
  }
};
