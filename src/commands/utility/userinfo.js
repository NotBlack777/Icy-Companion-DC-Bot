const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
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
    const target =
      interaction.options.getUser('user') ||
      interaction.user;

    const member =
      await interaction.guild.members.fetch(
        target.id
      );

    const roles =
      member.roles.cache
        .filter(role =>
          role.id !== interaction.guild.id
        )
        .map(role => role.toString())
        .slice(0, 15)
        .join(', ') || 'None';

    const badges = [];

    if (target.flags) {
      const flags =
        target.flags.toArray();

      const badgeMap = {
        Staff: '👨‍💼 Staff',
        Partner: '🤝 Partner',
        Hypesquad: '🎉 HypeSquad',
        BugHunterLevel1: '🐛 Bug Hunter',
        BugHunterLevel2: '🐞 Bug Hunter 2',
        PremiumEarlySupporter:
          '🌟 Early Supporter',
        VerifiedDeveloper:
          '👨‍💻 Verified Dev',
        ActiveDeveloper:
          '⚡ Active Dev',
        CertifiedModerator:
          '🛡️ Moderator',
      };

      for (const flag of flags) {
        if (badgeMap[flag]) {
          badges.push(
            badgeMap[flag]
          );
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setAuthor({
        name: target.tag,
        iconURL:
          target.displayAvatarURL(),
      })
      .setThumbnail(
        target.displayAvatarURL({
          dynamic: true,
          size: 4096,
        })
      )
      .addFields(
        {
          name: '🆔 User ID',
          value: `\`${target.id}\``,
          inline: false,
        },
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(
            target.createdTimestamp / 1000
          )}:F>`,
          inline: false,
        },
        {
          name: '📥 Joined Server',
          value: `<t:${Math.floor(
            member.joinedTimestamp / 1000
          )}:F>`,
          inline: false,
        },
        {
          name: '🏷️ Roles',
          value: roles,
          inline: false,
        },
        {
          name: '✨ Badges',
          value:
            badges.length > 0
              ? badges.join('\n')
              : 'None',
          inline: false,
        },
      )
      .setFooter({
        text:
          `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};