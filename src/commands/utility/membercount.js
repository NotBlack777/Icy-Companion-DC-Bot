const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription(
      'View server member statistics'
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    await guild.members.fetch();

    const total =
      guild.memberCount;

    const bots =
      guild.members.cache.filter(
        member => member.user.bot
      ).size;

    const humans =
      total - bots;

    const online =
      guild.members.cache.filter(
        member =>
          member.presence &&
          member.presence.status !==
            'offline'
      ).size;

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('👥 Member Count')
      .setThumbnail(
        guild.iconURL({
          dynamic: true,
          size: 4096,
        })
      )
      .addFields(
        {
          name: '👥 Total Members',
          value: `\`${total}\``,
          inline: true,
        },
        {
          name: '🧑 Humans',
          value: `\`${humans}\``,
          inline: true,
        },
        {
          name: '🤖 Bots',
          value: `\`${bots}\``,
          inline: true,
        },
        {
          name: '🟢 Online',
          value: `\`${online}\``,
          inline: true,
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