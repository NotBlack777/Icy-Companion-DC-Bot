/**
 * /purge-links — Quick purge of messages containing links
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasGuildPermissionOrOwner } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };
const URL_RE = /https?:\/\/[^\s]+/i;
const INVITE_RE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[^\s]+/i;

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge-links')
    .setDescription('Quickly purge messages containing links')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addBooleanOption(opt =>
      opt.setName('invites-only')
        .setDescription('Only delete Discord invite links')
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only from this user')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const invitesOnly = interaction.options.getBoolean('invites-only') ?? false;
    const user = interaction.options.getUser('user');

    if (!interaction.channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Cannot purge in this channel type.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!hasGuildPermissionOrOwner(interaction, 'ManageMessages')) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Missing Permissions').setDescription('You need **Manage Messages** permission.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = [...messages.values()];

      if (user) filtered = filtered.filter(m => m.author.id === user.id);
      filtered = filtered.filter(m => invitesOnly ? INVITE_RE.test(m.content) : URL_RE.test(m.content));

      const now = Date.now();
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000 && !m.pinned);

      if (!filtered.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Messages Found').setDescription(`No messages with ${invitesOnly ? 'invite links' : 'links'} found.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const desc = [`**Deleted:** \`${deleted.size}\` message(s) with ${invitesOnly ? 'invite links' : 'links'}`];
      if (user) desc.push(`**From:** ${user.tag}`);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🔗 Link Purge Complete')
          .setDescription(desc.join('\n'))
          .setFooter({ text: `✦ Purged by ${interaction.user.tag}` })
          .setTimestamp()
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Purge Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }
  }
};
