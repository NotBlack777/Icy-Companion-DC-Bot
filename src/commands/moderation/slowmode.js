/**
 * /slowmode — Set channel slowmode
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode delay for the current channel')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Slowmode delay in seconds (0 to disable, max 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Target channel (defaults to current)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the change')
        .setRequired(false)
    ),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Slowmode only works in text channels.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      await channel.setRateLimitPerUser(seconds, reason ? `[Slowmode] ${reason} — By ${interaction.user.tag}` : `[Slowmode] By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const desc = seconds === 0
      ? `Slowmode **disabled** in ${channel}`
      : `Slowmode set to **${seconds} second${seconds !== 1 ? 's' : ''}** in ${channel}`;

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setTitle('⏱️ Slowmode Updated')
        .setDescription(desc + (reason ? `\n**Reason:** ${reason}` : ''))
        .setFooter({ text: `✦ Set by ${interaction.user.tag}` })
        .setTimestamp()
      ]
    });
  }
};
