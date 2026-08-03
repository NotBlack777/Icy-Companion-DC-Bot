/**
 * /set-automod — Configure auto-moderation filters
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('set-automod')
    .setDescription('Configure auto-moderation filters')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Which filter to configure')
        .setRequired(true)
        .addChoices(
          { name: '🔗 Link Filter — Auto-delete messages with links', value: 'linkFilter' },
          { name: '📩 Invite Filter — Auto-delete Discord invite links', value: 'inviteFilter' },
          { name: '📢 Spam Filter — Auto-delete repeated/spammy messages', value: 'spamFilter' },
          { name: '🔠 Caps Filter — Auto-delete excessive caps', value: 'capsFilter' },
          { name: '🏷️ Mention Spam — Auto-delete mass mentions', value: 'mentionSpam' },
          { name: '🚫 Word Filter — Auto-delete blacklisted words', value: 'wordFilter' },
          { name: '⚡ Enable All — Turn on all filters', value: 'enableAll' },
          { name: '🛑 Disable All — Turn off all filters', value: 'disableAll' },
        )
    )
    .addBooleanOption(opt =>
      opt.setName('enabled')
        .setDescription('Enable or disable this filter')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('What action to take when filter triggers')
        .setRequired(false)
        .addChoices(
          { name: '🗑️ Delete message', value: 'delete' },
          { name: '⚠️ Delete + warn user', value: 'warn' },
          { name: '🔇 Delete + timeout user', value: 'timeout' },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('timeout-duration')
        .setDescription('Timeout duration in seconds (only for timeout action)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(2419200)
    )
    .addChannelOption(opt =>
      opt.setName('log-channel')
        .setDescription('Channel to log auto-mod actions')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('mention-threshold')
        .setDescription('Max mentions before triggering (for mention spam)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const filter = interaction.options.getString('filter');
    const enabled = interaction.options.getBoolean('enabled');
    const action = interaction.options.getString('action');
    const timeoutDuration = interaction.options.getInteger('timeout-duration');
    const logChannel = interaction.options.getChannel('log-channel');
    const mentionThreshold = interaction.options.getInteger('mention-threshold');

    // Ensure autoMod exists
    if (!config.autoMod || typeof config.autoMod !== 'object') {
      config.autoMod = {
        enabled: false, linkFilter: false, inviteFilter: false,
        spamFilter: false, capsFilter: false, mentionSpam: false,
        mentionSpamThreshold: 5, wordFilter: false, filteredWords: [],
        action: 'delete', timeoutDuration: 60, logChannel: null
      };
    }

    if (filter === 'enableAll') {
      config.autoMod.enabled = true;
      config.autoMod.linkFilter = true;
      config.autoMod.inviteFilter = true;
      config.autoMod.spamFilter = true;
      config.autoMod.capsFilter = true;
      config.autoMod.mentionSpam = true;
      config.autoMod.wordFilter = true;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('⚡ All Auto-Mod Filters Enabled')
          .setDescription([
            '> All auto-moderation filters have been **enabled**.',
            '',
            '```',
            '  ✅ Link Filter',
            '  ✅ Invite Filter',
            '  ✅ Spam Filter',
            '  ✅ Caps Filter',
            '  ✅ Mention Spam',
            '  ✅ Word Filter',
            '```',
          ].join('\n'))
          .setFooter({ text: '✦ Icy Companion — Auto-Mod' })
          .setTimestamp()
        ]
      });
    }

    if (filter === 'disableAll') {
      config.autoMod.enabled = false;
      config.autoMod.linkFilter = false;
      config.autoMod.inviteFilter = false;
      config.autoMod.spamFilter = false;
      config.autoMod.capsFilter = false;
      config.autoMod.mentionSpam = false;
      config.autoMod.wordFilter = false;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('🛑 All Auto-Mod Filters Disabled')
          .setDescription('> All auto-moderation filters have been **disabled**.')
          .setFooter({ text: '✦ Icy Companion — Auto-Mod' })
          .setTimestamp()
        ]
      });
    }

    // Apply changes
    if (enabled !== null) {
      config.autoMod[filter] = enabled;
      config.autoMod.enabled = true; // Master switch
    }

    if (action) config.autoMod.action = action;
    if (timeoutDuration) config.autoMod.timeoutDuration = timeoutDuration;
    if (logChannel) config.autoMod.logChannel = logChannel.id;
    if (mentionThreshold) config.autoMod.mentionSpamThreshold = mentionThreshold;

    saveServerConfig(interaction.guild.id, config);

    const filterNames = {
      linkFilter: '🔗 Link Filter',
      inviteFilter: '📩 Invite Filter',
      spamFilter: '📢 Spam Filter',
      capsFilter: '🔠 Caps Filter',
      mentionSpam: '🏷️ Mention Spam',
      wordFilter: '🚫 Word Filter',
    };

    const filterStatus = (val) => val ? '`✅ Enabled`' : '`❌ Disabled`';

    const lines = [
      `**Updated filter:** ${filterNames[filter] || filter}`,
      enabled !== null ? `**Status:** ${filterStatus(enabled)}` : '',
      action ? `**Action:** \`${action}\`` : '',
      timeoutDuration ? `**Timeout:** \`${timeoutDuration}s\`` : '',
      logChannel ? `**Log Channel:** ${logChannel}` : '',
      mentionThreshold ? `**Mention Threshold:** \`${mentionThreshold}\`` : '',
      '',
      '**Current Filter Status:**',
      `> 🔗 Links: ${filterStatus(config.autoMod.linkFilter)}`,
      `> 📩 Invites: ${filterStatus(config.autoMod.inviteFilter)}`,
      `> 📢 Spam: ${filterStatus(config.autoMod.spamFilter)}`,
      `> 🔠 Caps: ${filterStatus(config.autoMod.capsFilter)}`,
      `> 🏷️ Mentions: ${filterStatus(config.autoMod.mentionSpam)}`,
      `> 🚫 Words: ${filterStatus(config.autoMod.wordFilter)}`,
      '',
      `**Action:** \`${config.autoMod.action}\``,
    ].filter(Boolean);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⚙️ Auto-Mod Updated')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Auto-Mod' })
        .setTimestamp()
      ]
    });
  }
};
