const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server information'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const guild = interaction.guild;
    try {
      await guild.fetch();
    } catch (err) {
      console.warn(`[SERVERINFO] Could not refresh guild ${guild.id}: ${err.message}`);
    }

    let ownerText = `<@${guild.ownerId}>`;
    try {
      const owner = await guild.fetchOwner();
      ownerText = `**${owner.user.tag}** (\`${owner.user.id}\`)`;
    } catch (err) {
      console.warn(`[SERVERINFO] Could not fetch owner for ${guild.id}: ${err.message}`);
    }

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const emojis = guild.emojis.cache.size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier ?? 0;

    const embed = createEmbed({
      author: { name: guild.name, iconURL: guild.iconURL() || undefined },
      description: `### ${e('home')} Server Overview\n` +
                   `> **Server ID:** \`${guild.id}\`\n` +
                   `> **Owner:** ${ownerText}\n` +
                   `> **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n\n` +
                   `**Statistics:**\n` +
                   `> ${e('commands')} **Members:** \`${guild.memberCount}\`\n` +
                   `> ${e('file')} **Channels:** \`${textChannels + voiceChannels}\` (Text: ${textChannels}, VC: ${voiceChannels})\n` +
                   `> ${e('premium')} **Boosts:** \`${boosts}\` (Tier ${boostTier})\n` +
                   `> ${e('settings')} **Emojis:** \`${emojis}\``,
      thumbnail: guild.iconURL({ size: 1024 }),
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
