/**
 * /tempban — Temporarily ban a user with automatic unban
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user (auto-unban after duration)')
    .addUserOption(opt => opt.setName('user').setDescription('User to tempban').setRequired(true))
    .addIntegerOption(opt => opt.setName('hours').setDescription('Duration in hours (1-720)').setRequired(true).setMinValue(1).setMaxValue(720))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the tempban').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to delete (0-7)').setRequired(false).setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const hours = interaction.options.getInteger('hours');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 1;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Ban').setDescription(`Cannot ban **${user.tag}** — they may have a higher role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Try to DM the user
    if (member) {
      try {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor(ICY.lava)
            .setTitle(`🔨 Temporarily Banned — ${interaction.guild.name}`)
            .setDescription([
              `**Duration:** ${hours} hour(s)`,
              `**Reason:** ${reason}`,
              '',
              'You will be automatically unbanned after the duration expires.',
            ].join('\n'))
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ]
        }).catch(() => {});
      } catch {}
    }

    try {
      await interaction.guild.bans.create(user.id, {
        deleteMessageSeconds: days * 86400,
        reason: `[Temp Ban ${hours}h] ${reason} — By ${interaction.user.tag}`
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Tempban Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Schedule unban
    setTimeout(async () => {
      try {
        await interaction.guild.bans.remove(user.id, `[Auto-Unban] Temp ban of ${hours}h expired`);
        // Notify in the channel
        const channel = interaction.channel;
        if (channel) {
          await channel.send({
            embeds: [new EmbedBuilder()
              .setColor(ICY.success)
              .setTitle('⏰ Temp Ban Expired')
              .setDescription(`${user} (\`${user.id}\`) has been automatically unbanned.\n**Original reason:** ${reason}`)
              .setFooter({ text: '✦ Icy Companion — Auto-Unban' })
              .setTimestamp()
            ]
          }).catch(() => null);
        }
      } catch {}
    }, hours * 60 * 60 * 1000);

    const unbanAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.lava)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔨 User Temporarily Banned')
        .setDescription([
          '```',
          `  ╭─ Temp Ban`,
          `  │  User     : ${user.tag}`,
          `  │  ID       : ${user.id}`,
          `  │  Duration : ${hours} hour(s)`,
          `  │  Reason   : ${reason}`,
          `  │  Msgs     : ${days} day(s) deleted`,
          `  │  By       : ${interaction.user.tag}`,
          `  ╰────────────────────────`,
          '```',
          '',
          `⏰ Auto-unban: <t:${Math.floor(unbanAt.getTime() / 1000)}:F>`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    });
  }
};
