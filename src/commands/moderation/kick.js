/**
 * /kick — Kick a user from the server
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

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

    if (!member.kickable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Kick').setDescription(`Cannot kick **${user.tag}** — they may have a higher role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Try to DM the user before kicking
    try {
      await member.send({
        embeds: [new EmbedBuilder()
          .setColor(ICY.lava)
          .setTitle(`👢 You have been kicked — ${interaction.guild.name}`)
          .setDescription(`**Reason:** ${reason}\n\nYou can rejoin the server if you have an invite link.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ]
      }).catch(() => {});
    } catch {}

    try {
      await member.kick(`[Kick] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Kick Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.lava)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('👢 User Kicked')
        .setDescription([
          '```',
          `  ╭─ Kick`,
          `  │  User   : ${user.tag}`,
          `  │  ID     : ${user.id}`,
          `  │  Reason : ${reason}`,
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
