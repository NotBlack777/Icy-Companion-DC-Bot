const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const avatar = target.displayAvatarURL({ size: 1024 });

    const embed = createEmbed({
      author: { name: `${target.tag}`, iconURL: avatar },
      description: `[**Download Avatar**](${avatar})`,
      image: avatar,
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};
