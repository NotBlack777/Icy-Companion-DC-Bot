/**
 * /staff-add — Add a user to the staff role
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-add')
    .setDescription('Add a user to the staff role')
    .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = getServerConfig(interaction.guild.id);

    if (!config.staffRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Role Set').setDescription('Ask an admin to run `/set-staff-role` first.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(config.staffRole);
    if (!role) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Staff Role Missing').setDescription('The configured staff role no longer exists.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not in Server').setDescription(`${target} is not a member of this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (member.roles.cache.has(config.staffRole)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Already Staff').setDescription(`${target} already has the ${role.name} role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    await member.roles.add(role, `[Staff Add] By ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Staff Added')
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
