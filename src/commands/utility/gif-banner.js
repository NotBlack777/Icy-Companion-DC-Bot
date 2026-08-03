const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');
const {
  fetchUser,
  bannerUrl,
  gifBannerUrl,
  userName,
  requestedBy
} = require('../../utils/profileMedia');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('gif-banner')
    .setDescription('Get a user banner as a GIF when it is animated')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose banner you want to view')
        .setRequired(false)),

  async execute(interaction) {
    const selected = interaction.options.getUser('user') || interaction.user;
    const target = await fetchUser(selected);
    const gif = gifBannerUrl(target);
    const banner = bannerUrl(target);

    if (!banner) {
      return interaction.reply({
        content: `${e('error')} **${userName(target)}** does not have a profile banner.`,
        ephemeral: true
      });
    }

    const image = gif || banner;
    const isGif = Boolean(gif);
    const note = isGif
      ? 'This banner is animated and the GIF link is ready.'
      : 'This banner is static, so Discord does not provide a GIF version.';

    const embed = createEmbed({
      author: { name: `${e('loading')} ${userName(target)}`, iconURL: target.displayAvatarURL({ size: 256 }) },
      description: [
        `### ${isGif ? '🎞️' : '🖼️'} ${isGif ? 'GIF Banner' : 'Static Banner'}`,
        `> **User:** ${userName(target)}`,
        `> ${note}`,
        '',
        `[🔗 Open image](${image})`
      ].join('\n'),
      image,
      footer: { text: `Requested by ${requestedBy(interaction)}` },
      timestamp: true,
      color: isGif ? 0xf72585 : 0xffd60a
    });

    return interaction.reply({ embeds: [embed] });
  }
};
