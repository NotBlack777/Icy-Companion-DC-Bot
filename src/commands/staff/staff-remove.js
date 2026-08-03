/**
 * /staff-remove — Remove a user from the staff role
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-remove')
    .setDescription('Remove a user from the staff role')
    .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = getServerConfig(interaction.guild.id);

    if (!config.staffRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Role Set').setDescription('No staff role has been configured.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(config.staffRole);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member || !member.roles.cache.has(config.staffRole)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not Staff').setDescription(`${target} does not have the ${role?.name || 'staff'} role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    await member.roles.remove(role, `[Staff Remove] By ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Staff Removed')
        .setDescription([
          `**User:** ${target}`,
          `**Role:** ${role.name}`,
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
