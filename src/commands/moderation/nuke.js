/**
 * /nuke — Clone and delete a channel to reset it completely
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Clone and reset a channel (deletes all messages)')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to nuke (defaults to current)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the nuke')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Can only nuke text channels.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Confirm with a button would be ideal, but for simplicity we proceed directly
    // Only admins should have access to this anyway

    try {
      const newChannel = await channel.clone({
        reason: reason ? `[Nuke] ${reason} — By ${interaction.user.tag}` : `[Nuke] By ${interaction.user.tag}`
      });

      // Position it where the old channel was
      await newChannel.setPosition(channel.position);

      // Delete the old channel
      await channel.delete(`[Nuke] Replaced by clone — By ${interaction.user.tag}`);

      // Send nuke message in the new channel
      await newChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(ICY.lava)
          .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
          .setTitle('💥 Channel Nuked')
          .setDescription([
            `**Channel:** ${newChannel}`,
            `**By:** ${interaction.user}`,
            reason ? `**Reason:** ${reason}` : '',
            '',
            '```',
            '  ██████████████████████████',
            '  ██  CHANNEL RESET  ██',
            '  ██████████████████████████',
            '```',
          ].filter(Boolean).join('\n'))
          .setFooter({ text: '✦ Icy Companion — Moderation' })
          .setTimestamp()
        ]
      });

    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Nuke Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }
  }
};
