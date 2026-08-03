/**
 * /set-embed-colors — Customize embed colors for the bot
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

function parseHexColor(str) {
  if (!str) return null;
  const clean = str.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return parseInt(clean, 16);
  return null;
}

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('set-embed-colors')
    .setDescription('Customize the bot\'s embed colors')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Which color to change')
        .setRequired(true)
        .addChoices(
          { name: '✅ Success — Green success messages', value: 'success' },
          { name: '❌ Error — Red error messages', value: 'error' },
          { name: '⚠️ Warning — Yellow/orange warnings', value: 'warn' },
          { name: 'ℹ️ Info — Blue info messages', value: 'info' },
          { name: '🔄 Reset All — Reset to defaults', value: 'reset' },
        )
    )
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Hex color code (e.g. #00ff00 or 00ff00)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const type = interaction.options.getString('type');
    const colorStr = interaction.options.getString('color');

    // Ensure embedColors exists
    if (!config.embedColors || typeof config.embedColors !== 'object') {
      config.embedColors = { success: null, error: null, warn: null, info: null };
    }

    if (type === 'reset') {
      config.embedColors = { success: null, error: null, warn: null, info: null };
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🔄 Embed Colors Reset')
          .setDescription('> All embed colors have been reset to defaults.')
          .setFooter({ text: '✦ Icy Companion — Settings' })
          .setTimestamp()
        ]
      });
    }

    if (!colorStr) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('⚠️ Missing Color')
          .setDescription('Please provide a hex color code (e.g. `#00ff00` or `00ff00`).')
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const color = parseHexColor(colorStr);
    if (color === null) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.error)
          .setTitle('❌ Invalid Color')
          .setDescription('Please provide a valid 6-digit hex color code (e.g. `#00ff00`).')
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const previous = config.embedColors[type];
    config.embedColors[type] = color;
    saveServerConfig(interaction.guild.id, config);

    const typeNames = { success: '✅ Success', error: '❌ Error', warn: '⚠️ Warning', info: 'ℹ️ Info' };

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`🎨 ${typeNames[type]} Color Updated`)
        .setDescription([
          `> **New color:** \`#${colorStr.replace(/^#/, '').toUpperCase()}\``,
          previous !== null ? `> **Previous:** \`#${previous.toString(16).toUpperCase().padStart(6, '0')}\`` : '> **Previous:** default',
          '',
          'This color will be used for all bot embeds of this type.',
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Settings' })
        .setTimestamp()
      ]
    });
  }
};
