const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');
const { createEmbed, COLORS } = require('../../utils/uiHelper');
const { clearAllRateLimits } = require('../../utils/cooldown');

function rateLimitEmbed(config) {
  const rateLimit = config.rateLimit || { enabled: false, durationMs: 0 };
  const seconds = Math.round((Number(rateLimit.durationMs) || 0) / 1000);

  return createEmbed({
    title: 'Command Rate Limit',
    description: [
      `**Status:** ${rateLimit.enabled ? '`Enabled`' : '`Disabled`'}`,
      `**Duration:** \`${seconds}s\``,
      '',
      'Applies per user + per command for regular server slash commands.',
      'Server owners and global bot owners bypass it.'
    ].join('\n'),
    color: rateLimit.enabled ? COLORS.sky : COLORS.warn,
    compact: true
  });
}

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('rate-limit')
    .setDescription('Configure per-command rate limits')
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set rate limit duration and on/off state')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Turn rate limiting on or off')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('seconds')
            .setDescription('Cooldown duration in seconds')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(86400)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('off')
        .setDescription('Turn rate limiting off')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show the current rate limit settings')
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const subcommand = interaction.options.getSubcommand();
    config.rateLimit = config.rateLimit || { enabled: true, durationMs: 3000 };

    if (subcommand === 'status') {
      return interaction.reply({ embeds: [rateLimitEmbed(config)], ephemeral: true });
    }

    if (subcommand === 'off') {
      config.rateLimit.enabled = false;
      clearAllRateLimits();
      saveServerConfig(interaction.guild.id, config);
      return interaction.reply({ embeds: [rateLimitEmbed(config)], ephemeral: true });
    }

    const enabled = interaction.options.getBoolean('enabled');
    const seconds = interaction.options.getInteger('seconds');

    config.rateLimit.enabled = Boolean(enabled);
    if (seconds !== null) {
      config.rateLimit.durationMs = seconds * 1000;
      if (seconds === 0) config.rateLimit.enabled = false;
    }

    clearAllRateLimits();
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({ embeds: [rateLimitEmbed(config)], ephemeral: true });
  }
};
