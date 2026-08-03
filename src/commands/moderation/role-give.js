/**
 * /role-give — Give a role to a user
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('role-give')
    .setDescription('Give a role to a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role to give').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      const embed = new EmbedBuilder()
        .setColor(ICY.error)
        .setTitle('❌ Member Not Found')
        .setDescription(`**${user.tag}** is not a member of this server.`)
        .setFooter({ text: '✦ Icy Companion' }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
      const embed = new EmbedBuilder()
        .setColor(ICY.warn)
        .setTitle('⚠️ Already Has Role')
        .setDescription(`${user} already has the **${role.name}** role.`)
        .setFooter({ text: '✦ Icy Companion' }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await member.roles.add(role, `[Role Give] By ${interaction.user.tag}`);
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(ICY.error)
        .setTitle('❌ Failed to Add Role')
        .setDescription(`Could not give **${role.name}** to ${user}.\n> \`${err.message}\``)
        .setFooter({ text: '✦ Icy Companion' }).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(ICY.success)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('✅ Role Added')
      .setDescription([
        `**User:** ${user} (\`${user.id}\`)`,
        `**Role:** ${role}`,
        `**By:** ${interaction.user}`,
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Moderation' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
