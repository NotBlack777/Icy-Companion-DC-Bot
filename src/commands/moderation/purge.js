/**
 * /purge — Bulk delete messages with filters
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
    .addUserOption(opt => opt.setName('user').setDescription('Only delete messages from this user').setRequired(false))
    .addStringOption(opt => opt.setName('contains').setDescription('Only delete messages containing this text').setRequired(false)),

  async execute(interaction) {
    const amount = Math.min(Math.max(interaction.options.getInteger('amount') || 10, 1), 100);
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');

    if (!interaction.channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Cannot purge in this channel type.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = [...messages.values()];

      if (user) filtered = filtered.filter(m => m.author.id === user.id);
      if (contains) filtered = filtered.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));

      // Never delete messages older than 14 days
      const now = Date.now();
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      if (!filtered.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Messages').setDescription('No messages matched the filters (or all were older than 14 days).').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setAuthor({ name: '🗑️ Purge Complete', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
          .setTitle('🗑️ Purge Complete')
          .setDescription([
            `**Deleted:** \`${deleted.size}\` message(s)`,
            user ? `**From:** ${user.tag}` : '',
            contains ? `**Containing:** \`${contains}\`` : '',
            '',
            deleted.size < amount ? `⚠️ ${amount - deleted.size} messages were older than 14 days and skipped.` : '',
          ].filter(Boolean).join('\n'))
          .setFooter({ text: `✦ Purged by ${interaction.user.tag}` })
          .setTimestamp()
        ],
        ephemeral: false
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Purge Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }
  }
};
