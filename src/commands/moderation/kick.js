const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, errorEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed(`${user} is not a member of this server.`)], ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ embeds: [errorEmbed(`Cannot kick **${user.tag}** — they may have a higher role.`)], ephemeral: true });
    }

    try {
      const dmEmbed = createEmbed({
        color: 0xff4d6d,
        author: { name: 'Icy Companion', iconURL: interaction.client.user.displayAvatarURL() },
        description: `### ${e('error')} Kick Notification\n` +
                     `> **Server:** ${interaction.guild.name}\n` +
                     `> **Reason:** ${reason}\n\n` +
                     `*You can rejoin the server if you have an invite link.*`,
        timestamp: true
      });
      await member.send({ embeds: [dmEmbed] }).catch(() => null);
    } catch {}

    try {
      await member.kick(`[Kick] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Kick failed: \`${err.message}\``)], ephemeral: true });
    }

    const embed = createEmbed({
      color: 0xff4d6d,
      author: { name: 'User Kicked', iconURL: user.displayAvatarURL() },
      description: `### ${e('error')} Execution Details\n` +
                   `> **Target:** ${user.tag} (\`${user.id}\`)\n` +
                   `> **Reason:** ${reason}\n` +
                   `> **Moderator:** ${interaction.user.tag}`,
      footer: { text: 'Moderation Action Log' },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
