/**
 * /purge-emojis — Quick purge of messages containing custom emojis or stickers
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

// Custom emoji pattern: <:name:id> or <a:name:id>
const CUSTOM_EMOJI_RE = /<a?:\w+:\d+>/g;
// Unicode emoji approximate pattern
const UNICODE_EMOJI_RE = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/gu;

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge-emojis')
    .setDescription('Quickly purge messages containing emojis')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of emoji to filter')
        .setRequired(false)
        .addChoices(
          { name: '🎭 Custom emojis (server/other custom)', value: 'custom' },
          { name: '😀 All emojis (custom + unicode)', value: 'all' },
          { name: '🏷️ Stickers', value: 'stickers' },
          { name: '😀 Reactions only', value: 'reactions' },
        )
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only from this user')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const type = interaction.options.getString('type') || 'all';
    const user = interaction.options.getUser('user');

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
      let filtered = [...messages.values()];

      if (user) filtered = filtered.filter(m => m.author.id === user.id);

      switch (type) {
        case 'custom':
          filtered = filtered.filter(m => CUSTOM_EMOJI_RE.test(m.content));
          break;
        case 'all':
          filtered = filtered.filter(m =>
            CUSTOM_EMOJI_RE.test(m.content) || UNICODE_EMOJI_RE.test(m.content)
          );
          break;
        case 'stickers':
          filtered = filtered.filter(m => m.stickers.size > 0);
          break;
        case 'reactions':
          filtered = filtered.filter(m => m.reactions.cache.size > 0);
          break;
      }

      const now = Date.now();
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000 && !m.pinned);

      if (!filtered.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Messages Found').setDescription(`No messages with ${type} emojis/stickers found.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const typeLabels = { custom: 'custom emojis', all: 'emojis', stickers: 'stickers', reactions: 'reactions' };
      const desc = [`**Deleted:** \`${deleted.size}\` message(s) with ${typeLabels[type]}`];
      if (user) desc.push(`**From:** ${user.tag}`);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🎭 Emoji Purge Complete')
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
