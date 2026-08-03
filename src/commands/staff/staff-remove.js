/**
 * /staff-remove — Remove a user from one or all staff roles
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-remove')
    .setDescription('Remove a user from staff role(s)')
    .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Specific staff role to remove (optional, defaults to all)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const specificRole = interaction.options.getRole('role');
    const config = getServerConfig(interaction.guild.id);

    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Roles Set').setDescription('No staff roles have been configured.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
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

    // If a specific role is provided, only remove that one
    let rolesToRemove = [];
    if (specificRole) {
      if (!staffRoles.includes(specificRole.id)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not a Staff Role').setDescription(`${specificRole} is not a configured staff role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }
      rolesToRemove = [specificRole.id];
    } else {
      rolesToRemove = staffRoles;
    }

    const removed = [];
    const didNotHave = [];

    for (const roleId of rolesToRemove) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role, `[Staff Remove] By ${interaction.user.tag}`);
        removed.push(role.name);
      } else {
        didNotHave.push(role.name);
      }
    }

    if (!removed.length && !didNotHave.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ No Valid Roles').setDescription('None of the configured staff roles exist anymore.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!removed.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not Staff').setDescription(`${target} does not have any of the specified staff roles.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const lines = [`**User:** ${target}`];
    if (removed.length) lines.push(`**Removed from:** ${removed.map(r => `\`${r}\``).join(', ')}`);
    if (didNotHave.length) lines.push(`**Didn't have:** ${didNotHave.map(r => `\`${r}\``).join(', ')}`);
    lines.push(`**By:** ${interaction.user}`);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Staff Removed')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
