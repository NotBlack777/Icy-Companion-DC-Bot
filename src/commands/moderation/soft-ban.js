/**
 * /soft-ban — Soft-ban (ban then immediately unban to clear messages)
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('soft-ban')
    .setDescription('Ban then immediately unban a user to clear their messages')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the soft-ban').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not in Server').setDescription(`${user} is not a member of this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.bannable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Ban').setDescription(`Cannot ban **${user.tag}** — they may have a higher role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const banReason = `[Soft Ban] ${reason} — By ${interaction.user.tag}`;

    try {
      await interaction.guild.bans.create(user.id, { deleteMessageSeconds: 604800, reason: banReason });
      await interaction.guild.bans.remove(user.id, '[Soft Ban] Auto-unban after ban');
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Soft Ban Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.lava)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔨 Soft Ban Executed')
        .setDescription([
          '```',
          `  ╭─ Soft Ban`,
          `  │  User   : ${user.tag}`,
          `  │  ID     : ${user.id}`,
          `  │  Reason : ${reason}`,
          `  │  By     : ${interaction.user.tag}`,
          `  │  Cleared: Last 7 days of messages`,
          `  ╰────────────────────────`,
          '```',
          '',
          `User was banned and unbanned — they remain in the server with their messages purged.`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
