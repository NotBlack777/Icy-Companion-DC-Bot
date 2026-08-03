/**
 * /set-warn-actions — Configure automatic actions based on warning count
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('set-warn-actions')
    .setDescription('Configure automatic actions when a user reaches warning thresholds')
    .addIntegerOption(opt =>
      opt.setName('threshold')
        .setDescription('Number of warnings to trigger the action')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Action to take at this threshold')
        .setRequired(true)
        .addChoices(
          { name: '🔇 Timeout (10 minutes)', value: 'timeout' },
          { name: '👢 Kick', value: 'kick' },
          { name: '🔨 Ban', value: 'ban' },
          { name: '🗑️ Clear warnings', value: 'clear' },
          { name: '❌ Remove this threshold', value: 'remove' },
        )
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Timeout duration (e.g. 10m, 1h, 1d) — only for timeout action')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const threshold = interaction.options.getInteger('threshold');
    const action = interaction.options.getString('action');
    const durationStr = interaction.options.getString('duration');

    // Ensure warnActions array exists
    config.warnActions = Array.isArray(config.warnActions) ? config.warnActions : [];

    if (action === 'remove') {
      const before = config.warnActions.length;
      config.warnActions = config.warnActions.filter(a => a.threshold !== threshold);
      saveServerConfig(interaction.guild.id, config);

      if (config.warnActions.length === before) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not Found').setDescription(`No action configured for \`${threshold}\` warnings.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🗑️ Warning Action Removed')
          .setDescription(`Removed the action for \`${threshold}\` warnings.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ]
      });
    }

    // Parse duration for timeout
    let timeoutMs = 10 * 60 * 1000; // default 10 min
    if (durationStr) {
      const match = durationStr.match(/^(\d+)(s|m|h|d)$/i);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        timeoutMs = num * multipliers[unit];
      }
    }

    // Remove existing entry for this threshold
    config.warnActions = config.warnActions.filter(a => a.threshold !== threshold);

    // Add new entry
    config.warnActions.push({
      threshold,
      action,
      timeoutMs: action === 'timeout' ? timeoutMs : null,
      createdAt: new Date().toISOString()
    });

    // Sort by threshold
    config.warnActions.sort((a, b) => a.threshold - b.threshold);

    saveServerConfig(interaction.guild.id, config);

    const actionLabels = {
      timeout: '🔇 Timeout',
      kick: '👢 Kick',
      ban: '🔨 Ban',
      clear: '🗑️ Clear Warnings',
    };

    const lines = [
      `**Threshold:** \`${threshold}\` warning(s)`,
      `**Action:** ${actionLabels[action]}`,
    ];
    if (action === 'timeout' && durationStr) lines.push(`**Duration:** ${durationStr}`);
    lines.push('', '**All configured actions:**');

    for (const a of config.warnActions) {
      const label = { timeout: '🔇 Timeout', kick: '👢 Kick', ban: '🔨 Ban', clear: '🗑️ Clear' }[a.action] || a.action;
      lines.push(`> \`${a.threshold}\` warnings → ${label}`);
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle('⚡ Warning Auto-Action Set')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Settings' })
        .setTimestamp()
      ]
    });
  }
};
