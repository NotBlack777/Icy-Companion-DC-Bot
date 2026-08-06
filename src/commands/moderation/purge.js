/**
 * /purge — Bulk delete messages with extensive filters
 *
 * Filters: user, contains, embeds, images, links, bots, humans,
 *          attachments, stickers, mentions, invites, newlines, pins
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasGuildPermissionOrOwner } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, lava: 0xff4d6d, warn: 0xffaa00 };

// URL / invite patterns
const URL_RE = /https?:\/\/[^\s]+/i;
const INVITE_RE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[^\s]+/i;

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages with filters')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Apply a filter type')
        .setRequired(false)
        .addChoices(
          { name: '🔗 Links — messages containing URLs', value: 'links' },
          { name: '📩 Invites — messages containing Discord invites', value: 'invites' },
          { name: '🖼️ Images — messages with image attachments or embeds', value: 'images' },
          { name: '📎 Attachments — messages with any file attachment', value: 'attachments' },
          { name: '🤖 Bots — messages from bot accounts', value: 'bots' },
          { name: '👤 Humans — messages from human (non-bot) accounts', value: 'humans' },
          { name: '💬 Embeds — messages with embeds (rich content)', value: 'embeds' },
          { name: '🏷️ Mentions — messages containing @mentions', value: 'mentions' },
          { name: '😀 Stickers — messages containing stickers', value: 'stickers' },
          { name: '📝 Newlines — messages with 5+ newlines (spam)', value: 'newlines' },
          { name: '📌 Non-pinned — messages that are NOT pinned', value: 'nopins' },
          { name: '🔇 Spoilers — messages containing spoiler tags', value: 'spoilers' },
          { name: '🔤 Uppercase — messages mostly in CAPS', value: 'uppercase' },
          { name: '🎵 Audio — messages with audio attachments', value: 'audio' },
          { name: '📹 Video — messages with video attachments', value: 'video' },
        )
    )
    .addBooleanOption(opt =>
      opt.setName('include-pinned')
        .setDescription('Also delete pinned messages (default: skip pins)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('before')
        .setDescription('Only delete messages before this message ID (for pagination)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the purge (logged)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');
    const filter = interaction.options.getString('filter');
    const includePinned = interaction.options.getBoolean('include-pinned') ?? false;
    const beforeId = interaction.options.getString('before');
    const reason = interaction.options.getString('reason');

    if (!interaction.channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Channel').setDescription('Cannot purge in this channel type.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Check permissions
    if (!hasGuildPermissionOrOwner(interaction, 'ManageMessages')) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Missing Permissions').setDescription('You need the **Manage Messages** permission to use this command.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    try {
      const fetchOptions = { limit: amount };
      if (beforeId) fetchOptions.before = beforeId;

      const messages = await interaction.channel.messages.fetch(fetchOptions);
      let filtered = [...messages.values()];

      // User filter
      if (user) filtered = filtered.filter(m => m.author.id === user.id);

      // Contains filter
      if (contains) filtered = filtered.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));

      // Type filters
      if (filter) {
        switch (filter) {
          case 'links':
            filtered = filtered.filter(m => URL_RE.test(m.content));
            break;
          case 'invites':
            filtered = filtered.filter(m => INVITE_RE.test(m.content));
            break;
          case 'images':
            filtered = filtered.filter(m =>
              m.attachments.some(a => a.contentType?.startsWith('image/')) ||
              m.embeds.some(e => e.type === 'image' || e.type === 'rich' && e.thumbnail)
            );
            break;
          case 'attachments':
            filtered = filtered.filter(m => m.attachments.size > 0);
            break;
          case 'bots':
            filtered = filtered.filter(m => m.author.bot);
            break;
          case 'humans':
            filtered = filtered.filter(m => !m.author.bot);
            break;
          case 'embeds':
            filtered = filtered.filter(m => m.embeds.length > 0);
            break;
          case 'mentions':
            filtered = filtered.filter(m =>
              m.mentions.users.size > 0 || m.mentions.roles.size > 0 || m.mentions.everyone
            );
            break;
          case 'stickers':
            filtered = filtered.filter(m => m.stickers.size > 0);
            break;
          case 'newlines':
            filtered = filtered.filter(m => (m.content.match(/\n/g) || []).length >= 5);
            break;
          case 'nopins':
            filtered = filtered.filter(m => !m.pinned);
            break;
          case 'spoilers':
            filtered = filtered.filter(m => m.content.includes('||'));
            break;
          case 'uppercase': {
            filtered = filtered.filter(m => {
              const alpha = m.content.replace(/[^a-zA-Z]/g, '');
              return alpha.length >= 5 && alpha === alpha.toUpperCase();
            });
            break;
          }
          case 'audio':
            filtered = filtered.filter(m =>
              m.attachments.some(a =>
                a.contentType?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(a.name)
              )
            );
            break;
          case 'video':
            filtered = filtered.filter(m =>
              m.attachments.some(a =>
                a.contentType?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|wmv)$/i.test(a.name)
              )
            );
            break;
        }
      }

      // Pin filter (unless explicitly included)
      if (!includePinned) {
        filtered = filtered.filter(m => !m.pinned);
      }

      // Never delete messages older than 14 days (Discord limit)
      const now = Date.now();
      const tooOld = filtered.filter(m => now - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      if (!filtered.length) {
        const reasons = [];
        if (tooOld.length) reasons.push(`${tooOld.length} were older than 14 days`);
        if (!includePinned && amount > filtered.length + tooOld.length) reasons.push('pinned messages were skipped');

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(ICY.warn)
            .setTitle('⚠️ No Messages Matched')
            .setDescription([
              'No messages matched the specified filters.',
              reasons.length ? `\n${reasons.join('\n')}` : '',
            ].filter(Boolean).join('\n'))
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ],
          ephemeral: true
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      // Build result description
      const desc = [`**Deleted:** \`${deleted.size}\` message(s)`];
      if (user) desc.push(`**From:** ${user.tag}`);
      if (contains) desc.push(`**Containing:** \`${contains}\``);
      if (filter) desc.push(`**Filter:** \`${filter}\``);
      if (reason) desc.push(`**Reason:** ${reason}`);
      if (includePinned) desc.push('📌 Included pinned messages');
      if (tooOld.length) desc.push(`⚠️ ${tooOld.length} messages older than 14 days were skipped`);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
          .setTitle('🗑️ Purge Complete')
          .setDescription(desc.join('\n'))
          .setFooter({ text: `✦ Purged by ${interaction.user.tag} • ${interaction.channel.name}` })
          .setTimestamp()
        ],
        ephemeral: false
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Purge Failed').setDescription(`\`${err.message}\``).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }
  }
};
