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
    .setName('banner')
    .setDescription('View a user profile banner')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose banner you want to view')
        .setRequired(false)),

  async execute(interaction) {
    const selected = interaction.options.getUser('user') || interaction.user;
    const target = await fetchUser(selected);
    const banner = bannerUrl(target);
    const gif = gifBannerUrl(target);

    if (!banner) {
      return interaction.reply({
        content: `${e('error')} **${userName(target)}** does not have a profile banner.`,
        ephemeral: true
      });
    }

    const links = [`[🔗 Download banner](${banner})`];
    if (gif && gif !== banner) links.push(`[🎞️ GIF banner](${gif})`);

    const embed = createEmbed({
      author: { name: `${e('file')} ${userName(target)}`, iconURL: target.displayAvatarURL({ size: 256 }) },
      description: [
        '### 🖼️ Profile Banner',
        `> **User:** ${userName(target)}`,
        `> **Format:** ${gif ? 'Animated GIF' : 'Static image'}`,
        '',
        links.join('  •  ')
      ].join('\n'),
      image: banner,
      footer: { text: `Requested by ${requestedBy(interaction)}` },
      timestamp: true,
      color: 0x7df9ff
    });

    return interaction.reply({ embeds: [embed] });
  }
};
