const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, e, errorEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel to prevent members from sending messages')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock (defaults to current)').setRequired(false))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for locking').setRequired(false))
    .addRoleOption(opt => opt.setName('role').setDescription('Lock for a specific role (defaults to @everyone)').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');
    const role = interaction.options.getRole('role') || interaction.guild.roles.everyone;

    if (!channel.isTextBased()) {
      return interaction.reply({ embeds: [errorEmbed('Can only lock text channels.')], ephemeral: true });
    }

    try {
      await channel.permissionOverwrites.edit(role, {
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.SendMessagesInThreads]: false,
        [PermissionFlagsBits.CreatePublicThreads]: false,
        [PermissionFlagsBits.CreatePrivateThreads]: false,
      }, { reason: reason ? `[Lock] ${reason} — By ${interaction.user.tag}` : `[Lock] By ${interaction.user.tag}` });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Lock failed: \`${err.message}\``)], ephemeral: true });
    }

    const embed = createEmbed({
      color: 0xffaa00,
      author: { name: 'Channel Locked', iconURL: interaction.guild.iconURL() || undefined },
      description: `### 🔒 Security Alert\n` +
                   `> **Channel:** ${channel}\n` +
                   `> **Target Role:** ${role}\n` +
                   `> **Reason:** ${reason || 'No reason provided'}\n\n` +
                   `*Members are restricted from sending messages until unlocked.*`,
      footer: { text: `Locked by ${interaction.user.tag}` },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
