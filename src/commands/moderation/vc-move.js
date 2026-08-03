/**
 * /vc-move — Move a user between voice channels
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('vc-move')
    .setDescription('Move a user between voice channels')
    .addUserOption(opt => opt.setName('user').setDescription('User to move').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Target voice channel').setRequired(true)),

  async execute(interaction) {
    const user    = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');

    if (!channel.isVoiceBased()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription(`<#${channel.id}> is not a voice channel.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Member Not Found').setDescription(`**${user.tag}** is not in this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.voice?.channel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not in Voice').setDescription(`${user} is not connected to any voice channel.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!member.voice?.setChannel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Cannot Move').setDescription(`The bot lacks permission to move **${user.tag}**.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const fromChannel = member.voice.channel;

    try {
      await member.voice.setChannel(channel, `[VC Move] By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Move Failed').setDescription(`Could not move **${user.tag}**.\n> \`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '🔊 Voice Channel Move', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔊 User Moved')
        .setDescription([
          `**User:** ${user} (\`${user.id}\`)`,
          `**From:** ${fromChannel.name} (\`${fromChannel.id}\`)`,
          `**To:** ${channel.name} (\`${channel.id}\`)`,
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
