/**
 * /staff-add — Add a user to one or all staff roles
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-add')
    .setDescription('Add a user to the staff role(s)')
    .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Specific staff role to add (optional, defaults to all)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const specificRole = interaction.options.getRole('role');
    const config = getServerConfig(interaction.guild.id);

    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Roles Set').setDescription('Ask an admin to run `/set-staff-role` to add staff roles first.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
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

    // If a specific role is provided, only add that one
    let rolesToAdd = [];
    if (specificRole) {
      if (!staffRoles.includes(specificRole.id)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not a Staff Role').setDescription(`${specificRole} is not configured as a staff role. Use \`/set-staff-role\` to manage staff roles.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }
      rolesToAdd = [specificRole.id];
    } else {
      rolesToAdd = staffRoles;
    }

    const added = [];
    const alreadyHad = [];

    for (const roleId of rolesToAdd) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;

      if (member.roles.cache.has(roleId)) {
        alreadyHad.push(role.name);
      } else {
        await member.roles.add(role, `[Staff Add] By ${interaction.user.tag}`);
        added.push(role.name);
      }
    }

    if (!added.length && !alreadyHad.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ No Valid Roles').setDescription('None of the configured staff roles exist anymore.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const lines = [`**User:** ${target}`];
    if (added.length) lines.push(`**Added to:** ${added.map(r => `\`${r}\``).join(', ')}`);
    if (alreadyHad.length) lines.push(`**Already had:** ${alreadyHad.map(r => `\`${r}\``).join(', ')}`);
    lines.push(`**By:** ${interaction.user}`);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(added.length ? ICY.success : ICY.warn)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(added.length ? '✅ Staff Added' : '⚠️ Already Staff')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
