const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');
const {
  fetchUser,
  avatarUrl,
  gifAvatarUrl,
  bannerUrl,
  gifBannerUrl,
  userName,
  requestedBy
} = require('../../utils/profileMedia');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('profile-assets')
    .setDescription('Get a user profile picture, banner and download links')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose profile assets you want to view')
        .setRequired(false)),

  async execute(interaction) {
    const selected = interaction.options.getUser('user') || interaction.user;
    const target = await fetchUser(selected);
    const avatar = avatarUrl(target);
    const avatarGif = gifAvatarUrl(target);
    const banner = bannerUrl(target);
    const bannerGif = gifBannerUrl(target);
    const name = userName(target);

    const links = [];
    if (avatar) links.push(`[🖼️ PFP](${avatar})`);
    if (avatarGif && avatarGif !== avatar) links.push(`[🎞️ GIF PFP](${avatarGif})`);
    if (banner) links.push(`[🌌 Banner](${banner})`);
    if (bannerGif && bannerGif !== banner) links.push(`[🎞️ GIF banner](${bannerGif})`);

    if (!links.length) {
      return interaction.reply({
        content: `${e('error')} I couldn't find profile media for **${name}**.`,
        ephemeral: true
      });
    }

    const embeds = [createEmbed({
      author: { name: `${e('commands')} ${name}`, iconURL: avatar || undefined },
      description: [
        '### 🧊 Profile Assets',
        `> **User:** ${name}`,
        '> Tap an image to open it, or use the links below to download it.',
        '',
        links.join('  •  ')
      ].join('\n'),
      image: avatar || undefined,
      footer: { text: `Requested by ${requestedBy(interaction)}` },
      timestamp: true,
      color: 0x00d4ff
    })];

    if (banner) {
      embeds.push(createEmbed({
        author: { name: `${e('file')} ${name} — Banner`, iconURL: avatar || undefined },
        description: `[🔗 Open banner](${banner})${bannerGif ? `  •  [🎞️ GIF](${bannerGif})` : ''}`,
        image: banner,
        color: 0x7df9ff
      }));
    }

    return interaction.reply({ embeds });
  }
};
