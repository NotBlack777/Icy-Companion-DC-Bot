const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

function formatTimestamp(timestamp) {
  return timestamp ? `<t:${Math.floor(timestamp / 1000)}:F>` : 'Unknown';
}

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to lookup')
        .setRequired(false)
    ),

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
    const badges = [];
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

    for (const flag of flags) {
      if (badgeMap[flag]) badges.push(badgeMap[flag]);
    }

    const avatar = target.displayAvatarURL({ size: 4096 });

    const embed = new EmbedBuilder()
      .setColor(0x7dd3fc)
      .setAuthor({
        name: target.tag,
        iconURL: avatar
      })
      .setThumbnail(avatar)
      .addFields(
        {
          name: '🆔 User ID',
          value: `\`${target.id}\``,
          inline: false
        },
        {
          name: '📅 Account Created',
          value: formatTimestamp(target.createdTimestamp),
          inline: false
        },
        {
          name: '📥 Joined Server',
          value: formatTimestamp(member?.joinedTimestamp),
          inline: false
        },
        {
          name: `🏷️ Roles${roleSuffix}`,
          value: roles,
          inline: false
        },
        {
          name: '✨ Badges',
          value: badges.length > 0 ? badges.join('\n') : 'None',
          inline: false
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
