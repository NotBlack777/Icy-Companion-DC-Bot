const { EmbedBuilder } = require('discord.js');
const globalStore = require('./globalStore');
const defaultEmojis = require('../assets/emojis');

/**
 * Get an emoji by name, falling back to defaultEmojis then a string.
 */
function e(name) {
  return globalStore.getEmoji(name) || defaultEmojis[name] || '';
}

/**
 * Creates a Moonveil-style sleek embed.
 */
function createEmbed({
  title = null,
  description = null,
  color = 0x2b2d31, // Dark grey, standard "sleek" color
  fields = [],
  footer = null,
  thumbnail = null,
  image = null,
  author = null,
  timestamp = false
}) {
  const embed = new EmbedBuilder().setColor(color);

  if (author) {
    embed.setAuthor(author);
  }

  if (title) {
    // In Moonveil style, we often put the title in the description or author
    // but if provided, we'll use it.
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) {
    embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (image) {
    embed.setImage(image);
  }

  if (timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

/**
 * A sleek info embed.
 */
function infoEmbed(text) {
  return createEmbed({
    description: `${e('info')} ${text}`
  });
}

/**
 * A sleek success embed.
 */
function successEmbed(text) {
  return createEmbed({
    description: `${e('success')} ${text}`,
    color: 0x00f5a0
  });
}

/**
 * A sleek error embed.
 */
function errorEmbed(text) {
  return createEmbed({
    description: `${e('error')} ${text}`,
    color: 0xff3d71
  });
}

module.exports = {
  createEmbed,
  infoEmbed,
  successEmbed,
  errorEmbed,
  e
};
