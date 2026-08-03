/**
 * /word-filter — Manage the auto-mod word filter list
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('word-filter')
    .setDescription('Manage the auto-mod word filter')
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('What to do')
        .setRequired(true)
        .addChoices(
          { name: '➕ Add word(s)', value: 'add' },
          { name: '➖ Remove word(s)', value: 'remove' },
          { name: '📋 List all filtered words', value: 'list' },
          { name: '🗑️ Clear all filtered words', value: 'clear' },
        )
    )
    .addStringOption(opt =>
      opt.setName('words')
        .setDescription('Comma-separated words to add/remove')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const action = interaction.options.getString('action');
    const wordsStr = interaction.options.getString('words');

    // Ensure autoMod and filteredWords exist
    if (!config.autoMod) config.autoMod = {};
    config.autoMod.filteredWords = Array.isArray(config.autoMod.filteredWords) ? config.autoMod.filteredWords : [];

    if (action === 'list') {
      const words = config.autoMod.filteredWords;
      if (!words.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(ICY.warn)
            .setTitle('📋 Word Filter List')
            .setDescription('No filtered words configured.\n\nUse `/word-filter add <words>` to add words.')
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.frost)
          .setTitle(`📋 Filtered Words (${words.length})`)
          .setDescription(words.map((w, i) => `\`${i + 1}.\` ||${w}||`).join('\n'))
          .setFooter({ text: '✦ Icy Companion — Word Filter' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (action === 'clear') {
      const count = config.autoMod.filteredWords.length;
      config.autoMod.filteredWords = [];
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🗑️ Word Filter Cleared')
          .setDescription(`Removed \`${count}\` filtered word(s).`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ]
      });
    }

    if (!wordsStr) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('⚠️ Missing Words').setDescription('Please provide comma-separated words.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const words = wordsStr.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

    if (!words.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('⚠️ No Words Provided').setDescription('Please provide valid words.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (action === 'add') {
      const added = [];
      const alreadyExists = [];

      for (const word of words) {
        if (config.autoMod.filteredWords.includes(word)) {
          alreadyExists.push(word);
        } else {
          config.autoMod.filteredWords.push(word);
          added.push(word);
        }
      }

      // Enable word filter automatically
      if (added.length) config.autoMod.wordFilter = true;
      saveServerConfig(interaction.guild.id, config);

      const lines = [];
      if (added.length) lines.push(`**Added:** ${added.map(w => `\`${w}\``).join(', ')}`);
      if (alreadyExists.length) lines.push(`**Already existed:** ${alreadyExists.map(w => `\`${w}\``).join(', ')}`);
      lines.push(`\n**Total filtered words:** \`${config.autoMod.filteredWords.length}\``);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('➕ Words Added to Filter')
          .setDescription(lines.join('\n'))
          .setFooter({ text: '✦ Icy Companion — Word Filter' })
          .setTimestamp()
        ]
      });
    }

    if (action === 'remove') {
      const removed = [];
      const notFound = [];

      for (const word of words) {
        const index = config.autoMod.filteredWords.indexOf(word);
        if (index !== -1) {
          config.autoMod.filteredWords.splice(index, 1);
          removed.push(word);
        } else {
          notFound.push(word);
        }
      }

      saveServerConfig(interaction.guild.id, config);

      const lines = [];
      if (removed.length) lines.push(`**Removed:** ${removed.map(w => `\`${w}\``).join(', ')}`);
      if (notFound.length) lines.push(`**Not found:** ${notFound.map(w => `\`${w}\``).join(', ')}`);
      lines.push(`\n**Remaining:** \`${config.autoMod.filteredWords.length}\``);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('➖ Words Removed from Filter')
          .setDescription(lines.join('\n'))
          .setFooter({ text: '✦ Icy Companion — Word Filter' })
          .setTimestamp()
        ]
      });
    }
  }
};
