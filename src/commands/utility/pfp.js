const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');
const {
  fetchUser,
  avatarUrl,
  gifAvatarUrl,
  userName,
  requestedBy
} = require('../../utils/profileMedia');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('pfp')
    .setDescription('View a user profile picture')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose profile picture you want to view')
        .setRequired(false)),

  async execute(interaction) {
    const selected = interaction.options.getUser('user') || interaction.user;
    const target = await fetchUser(selected);
    const avatar = avatarUrl(target);
    const gif = gifAvatarUrl(target);

    if (!avatar) {
      return interaction.reply({
        content: `${e('error')} I couldn't find a profile picture for **${userName(target)}**.`,
        ephemeral: true
      });
    }

    const links = [`[🔗 Download PFP](${avatar})`];
    if (gif && gif !== avatar) links.push(`[🎞️ GIF](${gif})`);

    const embed = createEmbed({
      author: { name: `${e('search')} ${userName(target)}`, iconURL: avatar },
      description: [
        '### 🖼️ Profile Picture',
        `> **User:** ${userName(target)}`,
        '',
        links.join('  •  ')
      ].join('\n'),
      image: avatar,
      footer: { text: `Requested by ${requestedBy(interaction)}` },
      timestamp: true,
      color: 0x00d4ff
    });

    return interaction.reply({ embeds: [embed] });
  }
};
