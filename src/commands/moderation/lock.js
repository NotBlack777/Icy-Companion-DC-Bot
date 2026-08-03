/**
 * /lock — Lock a channel (prevent members from sending messages)
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel to prevent members from sending messages')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to lock (defaults to current)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for locking')
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('Lock for a specific role (defaults to @everyone)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');
    const role = interaction.options.getRole('role') || interaction.guild.roles.everyone;

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Can only lock text channels.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await channel.permissionOverwrites.edit(role, {
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.SendMessagesInThreads]: false,
        [PermissionFlagsBits.CreatePublicThreads]: false,
        [PermissionFlagsBits.CreatePrivateThreads]: false,
      }, { reason: reason ? `[Lock] ${reason} — By ${interaction.user.tag}` : `[Lock] By ${interaction.user.tag}` });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Lock Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.warn)
        .setTitle('🔒 Channel Locked')
        .setDescription([
          `**Channel:** ${channel}`,
          `**Role:** ${role}`,
          reason ? `**Reason:** ${reason}` : '',
          '',
          'Members cannot send messages until unlocked with `/unlock`.',
        ].filter(Boolean).join('\n'))
        .setFooter({ text: `✦ Locked by ${interaction.user.tag}` })
        .setTimestamp()
      ]
    });
  }
};
