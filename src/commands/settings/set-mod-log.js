/**
 * /set-mod-log — Set the moderation log channel
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('set-mod-log')
    .setDescription('Set or clear the moderation log channel')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel for mod logs (leave empty to disable)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const channel = interaction.options.getChannel('channel');

    if (!channel) {
      const previous = config.modLogChannel;
      config.modLogChannel = null;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('🧹 Mod Log Disabled')
          .setDescription(previous ? `> Removed: <#${previous}>` : '> Mod log was not configured.')
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ]
      });
    }

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Must be a text channel.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    config.modLogChannel = channel.id;
    // Also set the autoMod log channel to the same if not set
    if (!config.autoMod.logChannel) config.autoMod.logChannel = channel.id;
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle('✅ Mod Log Channel Set')
        .setDescription([
          `> **Channel:** ${channel}`,
          '',
          'All moderation actions (ban, kick, warn, timeout, purge, etc.) will be logged here.',
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Settings' })
        .setTimestamp()
      ]
    });
  }
};
