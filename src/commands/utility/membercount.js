const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('View server member statistics'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const guild = interaction.guild;

    try {
      await guild.members.fetch();
    } catch (err) {
      console.warn(`[MEMBERCOUNT] Could not fetch all members in ${guild.id}: ${err.message}`);
    }

    const total = guild.memberCount ?? guild.members.cache.size;
    const bots = guild.members.cache.filter(member => member.user.bot).size;
    const humans = Math.max(0, total - bots);
    const online = guild.members.cache.filter(member => member.presence && member.presence.status !== 'offline').size;

    const embed = createEmbed({
      description: `### ${e('home')} Server Population\n` +
                   `> **Total Members:** \`${total}\`\n` +
                   `> **Humans:** \`${humans}\`\n` +
                   `> **Bots:** \`${bots}\` (cached)\n` +
                   `> **Online:** \`${online}\` (cached)`,
      thumbnail: guild.iconURL({ size: 1024 }),
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
