const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, errorEmbed, successEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user in all voice channels')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes (optional)').setMinValue(1).setMaxValue(40320))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason (optional)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed(`**${user.tag}** is not in this server.`)], ephemeral: true });
    }

    try {
      await member.voice.setMute(true, `[Mute] ${reason} — By ${interaction.user.tag}`);
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Could not mute **${user.tag}**.\n> \`${err.message}\``)], ephemeral: true });
    }

    if (minutes) {
      const duration = new Date(Date.now() + minutes * 60 * 1000);
      try {
        await member.disableCommunicationUntil(duration, `[Mute] ${reason} — By ${interaction.user.tag}`);
      } catch {}
    }

    const durationLine = minutes
      ? `\`${minutes}\` minute${minutes !== 1 ? 's' : ''}`
      : 'Indefinite';

    const embed = createEmbed({
      color: 0x00f5a0,
      author: { name: 'User Muted', iconURL: user.displayAvatarURL() },
      description: `### 🔇 Silence Applied\n` +
                   `> **Target:** ${user.tag} (\`${user.id}\`)\n` +
                   `> **Duration:** ${durationLine}\n` +
                   `> **Reason:** ${reason}\n` +
                   `> **Moderator:** ${interaction.user.tag}`,
      footer: { text: 'Voice mute & Timeout applied' },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
