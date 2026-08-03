/**
 * /purge-images — Quick purge of messages containing images/media
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge-images')
    .setDescription('Quickly purge messages containing images or media')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Media type to purge')
        .setRequired(false)
        .addChoices(
          { name: '🖼️ Images (jpg, png, gif, webp)', value: 'images' },
          { name: '📹 Videos (mp4, mov, webm)', value: 'videos' },
          { name: '🎵 Audio (mp3, wav, ogg)', value: 'audio' },
          { name: '📎 All attachments', value: 'all' },
          { name: '💬 Embeds (rich embeds, link previews)', value: 'embeds' },
        )
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only from this user')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const mediaType = interaction.options.getString('type') || 'images';
    const user = interaction.options.getUser('user');

    if (!interaction.channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Cannot purge in this channel type.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Missing Permissions').setDescription('You need **Manage Messages** permission.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = [...messages.values()];

      if (user) filtered = filtered.filter(m => m.author.id === user.id);

      switch (mediaType) {
        case 'images':
          filtered = filtered.filter(m =>
            m.attachments.some(a => a.contentType?.startsWith('image/')) ||
            m.embeds.some(e => e.type === 'image' || e.thumbnail)
          );
          break;
        case 'videos':
          filtered = filtered.filter(m =>
            m.attachments.some(a =>
              a.contentType?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|wmv)$/i.test(a.name)
            )
          );
          break;
        case 'audio':
          filtered = filtered.filter(m =>
            m.attachments.some(a =>
              a.contentType?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(a.name)
            )
          );
          break;
        case 'all':
          filtered = filtered.filter(m => m.attachments.size > 0);
          break;
        case 'embeds':
          filtered = filtered.filter(m => m.embeds.length > 0);
          break;
      }

      const now = Date.now();
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000 && !m.pinned);

      if (!filtered.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Messages Found').setDescription(`No messages with ${mediaType} found.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const typeLabels = { images: 'images', videos: 'videos', audio: 'audio', all: 'attachments', embeds: 'embeds' };
      const desc = [`**Deleted:** \`${deleted.size}\` message(s) with ${typeLabels[mediaType]}`];
      if (user) desc.push(`**From:** ${user.tag}`);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setTitle('🖼️ Media Purge Complete')
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
