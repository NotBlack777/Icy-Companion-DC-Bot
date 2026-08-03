const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

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
      ownerText = `${owner.user.tag} (${owner.user.id})`;
    } catch (err) {
      console.warn(`[SERVERINFO] Could not fetch owner for ${guild.id}: ${err.message}`);
    }

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const emojis = guild.emojis.cache.size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier ?? 0;
    const icon = guild.iconURL({ size: 4096 });

    const embed = new EmbedBuilder()
      .setColor(0x7dd3fc)
      .setAuthor({
        name: guild.name,
        iconURL: icon || undefined
      })
      .addFields(
        {
          name: '🆔 Server ID',
          value: `\`${guild.id}\``,
          inline: false
        },
        {
          name: '👑 Owner',
          value: ownerText,
          inline: true
        },
        {
          name: '👥 Members',
          value: `\`${guild.memberCount ?? 'Unknown'}\``,
          inline: true
        },
        {
          name: '📅 Created',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: false
        },
        {
          name: '💬 Channels',
          value: `Text: \`${textChannels}\`\nVoice: \`${voiceChannels}\`\nCategories: \`${categories}\``,
          inline: true
        },
        {
          name: '🚀 Boosts',
          value: `Level: \`${boostTier}\`\nBoosts: \`${boosts}\``,
          inline: true
        },
        {
          name: '😀 Emojis',
          value: `\`${emojis}\``,
          inline: true
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`
      })
      .setTimestamp();

    if (icon) embed.setThumbnail(icon);

    return interaction.reply({ embeds: [embed] });
  }
};
