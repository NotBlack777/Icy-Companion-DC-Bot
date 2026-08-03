const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

function formatTimestamp(timestamp) {
  return timestamp ? `<t:${Math.floor(timestamp / 1000)}:F>` : 'Unknown';
}

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to lookup')
        .setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('user') || interaction.user;
    let member = null;
    try {
      member = await interaction.guild.members.fetch(target.id);
    } catch (err) {
      console.warn(`[USERINFO] Could not fetch member ${target.id} in ${interaction.guild.id}: ${err.message}`);
    }

    const roles = member?.roles?.cache
      ?.filter(role => role.id !== interaction.guild.id)
      .map(role => role.toString())
      .slice(0, 15)
      .join(', ') || 'None';

    const roleSuffix = member?.roles?.cache?.size > 16 ? ' (showing first 15)' : '';
    const flags = target.flags?.toArray?.() || [];
    const badgeMap = {
      Staff: '👨‍💼 Staff',
      Partner: '🤝 Partner',
      Hypesquad: '🎉 HypeSquad',
      BugHunterLevel1: '🐛 Bug Hunter',
      BugHunterLevel2: '🐞 Bug Hunter 2',
      PremiumEarlySupporter: '🌟 Early Supporter',
      VerifiedDeveloper: '👨‍💻 Verified Dev',
      ActiveDeveloper: '⚡ Active Dev',
      CertifiedModerator: '🛡️ Moderator'
    };
    const badges = flags.map(flag => badgeMap[flag]).filter(Boolean);

    const embed = createEmbed({
      author: { name: target.tag, iconURL: target.displayAvatarURL() },
      description: `### ${e('commands')} User Information\n` +
                   `> **User ID:** \`${target.id}\`\n` +
                   `> **Created:** ${formatTimestamp(target.createdTimestamp)}\n` +
                   `> **Joined:** ${formatTimestamp(member?.joinedTimestamp)}\n` +
                   `> **Badges:** ${badges.join(', ') || 'None'}\n\n` +
                   `**Roles${roleSuffix}:**\n${roles}`,
      thumbnail: target.displayAvatarURL({ size: 1024 }),
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
