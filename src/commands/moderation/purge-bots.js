/**
 * /purge-bots — Quick purge of bot messages
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge-bots')
    .setDescription('Quickly purge messages from bot accounts')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(opt =>
      opt.setName('bot')
        .setDescription('Only from a specific bot (name or ID)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const botFilter = interaction.options.getString('bot');

    if (!interaction.channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Cannot purge in this channel type.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Missing Permissions').setDescription('You need **Manage Messages** permission.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = [...messages.values()].filter(m => m.author.bot);

      if (botFilter) {
        filtered = filtered.filter(m =>
          m.author.username.toLowerCase().includes(botFilter.toLowerCase()) ||
          m.author.id === botFilter
        );
      }

      const now = Date.now();
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000 && !m.pinned);

      if (!filtered.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Bot Messages Found').setDescription('No bot messages matched the filter.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const desc = [`**Deleted:** \`${deleted.size}\` bot message(s)`];
      if (botFilter) desc.push(`**Bot filter:** \`${botFilter}\``);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🤖 Bot Purge Complete')
          .setDescription(desc.join('\n'))
          .setFooter({ text: `✦ Purged by ${interaction.user.tag}` })
          .setTimestamp()
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Purge Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }
  }
};
