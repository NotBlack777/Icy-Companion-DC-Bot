/**
 * /set-purge-log — Set the purge log channel
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('set-purge-log')
    .setDescription('Set or clear the purge log channel')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel for purge logs (leave empty to disable)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const channel = interaction.options.getChannel('channel');

    if (!channel) {
      const previous = config.purgeLogChannel;
      config.purgeLogChannel = null;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('🧹 Purge Log Disabled')
          .setDescription(previous ? `> Removed: <#${previous}>` : '> Purge log was not configured.')
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

    config.purgeLogChannel = channel.id;
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle('✅ Purge Log Channel Set')
        .setDescription([
          `> **Channel:** ${channel}`,
          '',
          'All purge operations will be logged here with details.',
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Settings' })
        .setTimestamp()
      ]
    });
  }
};
