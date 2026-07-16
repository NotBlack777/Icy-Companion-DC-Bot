const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server information'),

  async execute(interaction) {
    const guild = interaction.guild;

    await guild.fetch();

    const owner =
      await guild.fetchOwner();

    const textChannels =
      guild.channels.cache.filter(
        c => c.type === 0
      ).size;

    const voiceChannels =
      guild.channels.cache.filter(
        c => c.type === 2
      ).size;

    const categories =
      guild.channels.cache.filter(
        c => c.type === 4
      ).size;

    const emojis =
      guild.emojis.cache.size;

    const boosts =
      guild.premiumSubscriptionCount || 0;

    const boostTier =
      guild.premiumTier;

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setAuthor({
        name: guild.name,
        iconURL:
          guild.iconURL({
            dynamic: true,
          }),
      })
      .setThumbnail(
        guild.iconURL({
          dynamic: true,
          size: 4096,
        })
      )
      .addFields(
        {
          name: '🆔 Server ID',
          value: `\`${guild.id}\``,
          inline: false,
        },
        {
          name: '👑 Owner',
          value: `${owner.user.tag}`,
          inline: true,
        },
        {
          name: '👥 Members',
          value:
            `\`${guild.memberCount}\``,
          inline: true,
        },
        {
          name: '📅 Created',
          value: `<t:${Math.floor(
            guild.createdTimestamp / 1000
          )}:F>`,
          inline: false,
        },
        {
          name: '💬 Channels',
          value:
            `Text: \`${textChannels}\`\n` +
            `Voice: \`${voiceChannels}\`\n` +
            `Categories: \`${categories}\``,
          inline: true,
        },
        {
          name: '🚀 Boosts',
          value:
            `Level: \`${boostTier}\`\n` +
            `Boosts: \`${boosts}\``,
          inline: true,
        },
        {
          name: '😀 Emojis',
          value: `\`${emojis}\``,
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