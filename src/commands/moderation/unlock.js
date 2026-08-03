/**
 * /unlock — Unlock a previously locked channel
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to unlock (defaults to current)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for unlocking')
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('Unlock for a specific role (defaults to @everyone)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');
    const role = interaction.options.getRole('role') || interaction.guild.roles.everyone;

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Can only unlock text channels.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await channel.permissionOverwrites.edit(role, {
        [PermissionFlagsBits.SendMessages]: null,
        [PermissionFlagsBits.SendMessagesInThreads]: null,
        [PermissionFlagsBits.CreatePublicThreads]: null,
        [PermissionFlagsBits.CreatePrivateThreads]: null,
      }, { reason: reason ? `[Unlock] ${reason} — By ${interaction.user.tag}` : `[Unlock] By ${interaction.user.tag}` });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Unlock Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle('🔓 Channel Unlocked')
        .setDescription([
          `**Channel:** ${channel}`,
          `**Role:** ${role}`,
          reason ? `**Reason:** ${reason}` : '',
          '',
          'Members can now send messages again.',
        ].filter(Boolean).join('\n'))
        .setFooter({ text: `✦ Unlocked by ${interaction.user.tag}` })
        .setTimestamp()
      ]
    });
  }
};
