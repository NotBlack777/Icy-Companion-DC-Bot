/**
 * /role-remove — Remove a role from a user
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('Remove a role from a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Member Not Found').setDescription(`**${user.tag}** is not in this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Role').setDescription(`${user} does not have the **${role.name}** role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await member.roles.remove(role, `[Role Remove] By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Failed').setDescription(`Could not remove **${role.name}** from ${user}.\n> \`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Role Removed')
        .setDescription([ `**User:** ${user}`, `**Role:** ${role}`, `**By:** ${interaction.user}` ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
