const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user avatar')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user') ||
      interaction.user;

    const avatar =
      target.displayAvatarURL({
        size: 4096,
        dynamic: true,
      });

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle(`${target.username}'s Avatar`)
      .setImage(avatar)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};