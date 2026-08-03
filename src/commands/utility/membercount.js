const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

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
      // The bot may not have the GuildMembers intent. Cached members still provide useful stats.
      console.warn(`[MEMBERCOUNT] Could not fetch all members in ${guild.id}: ${err.message}`);
    }

    const total = guild.memberCount ?? guild.members.cache.size;
    const bots = guild.members.cache.filter(member => member.user.bot).size;
    const humans = Math.max(0, total - bots);
    const online = guild.members.cache.filter(member => member.presence && member.presence.status !== 'offline').size;

    const embed = new EmbedBuilder()
      .setColor(0x7dd3fc)
      .setTitle('👥 Member Count')
      .addFields(
        {
          name: '👥 Total Members',
          value: `\`${total}\``,
          inline: true
        },
        {
          name: '🧑 Humans',
          value: `\`${humans}\``,
          inline: true
        },
        {
          name: '🤖 Bots (cached)',
          value: `\`${bots}\``,
          inline: true
        },
        {
          name: '🟢 Online (cached)',
          value: `\`${online}\``,
          inline: true
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`
      })
      .setTimestamp();

    const icon = guild.iconURL({ size: 4096 });
    if (icon) embed.setThumbnail(icon);

    return interaction.reply({ embeds: [embed] });
  }
};
