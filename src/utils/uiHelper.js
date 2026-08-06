const { EmbedBuilder } = require('discord.js');
const globalStore = require('./globalStore');
const defaultEmojis = require('../assets/emojis');
const { createColorProxy, getTheme } = require('./themeManager');

const COLORS = createColorProxy();
const BRAND = {};
Object.defineProperties(BRAND, {
  name: { enumerable: true, get: () => 'Icy Companion' },
  footer: { enumerable: true, get: () => getTheme().footer },
  divider: { enumerable: true, get: () => getTheme().divider },
  thin: { enumerable: true, get: () => getTheme().thin },
  interfaceName: { enumerable: true, get: () => getTheme().interfaceName }
});

/**
 * Get an emoji by name, falling back to defaultEmojis then a string.
 */
function e(name) {
  return globalStore.getEmoji(name) || defaultEmojis[name] || '';
}

function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function cleanIcon(value) {
  return isUrl(value) ? value : undefined;
}

function truncate(text, max = 4096) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function statusIcon(color) {
  if (color === COLORS.success || color === 0x00f5a0 || color === 0x22c55e) return e('success') || '✅';
  if (color === COLORS.error || color === 0xff3d71 || color === 0xff4d6d || color === 0xf43f5e) return e('error') || '❌';
  if (color === COLORS.warn || color === COLORS.orange || color === COLORS.sunrise || color === 0xffaa00 || color === 0xffd60a || color === 0xf59e0b) return '🌅';
  return e('ice') || '🧊';
}

function normalizeAuthor(author, color) {
  if (author === false) return null;

  const icon = statusIcon(color);
  if (!author) {
    return { name: `${icon} ${BRAND.name}`, iconURL: undefined };
  }

  if (typeof author === 'string') {
    return { name: author, iconURL: undefined };
  }

  return {
    ...author,
    name: author.name || BRAND.name,
    iconURL: cleanIcon(author.iconURL)
  };
}

function normalizeFooter(footer) {
  if (footer === false) return null;
  if (!footer) return { text: BRAND.footer };
  if (typeof footer === 'string') return { text: footer };
  return { ...footer, iconURL: cleanIcon(footer.iconURL) };
}

function normalizeDescription(description, { compact = false, color = COLORS.frost } = {}) {
  if (!description) return null;

  const text = String(description).trim();
  if (!text) return null;
  if (compact) return truncate(text);

  // Give every central embed a consistent sleek-card shape without
  // destroying command-specific Markdown already present in the body.
  const icon = statusIcon(color);
  const body = [
    `> ${icon} **${BRAND.interfaceName}**`,
    BRAND.divider,
    text,
    BRAND.thin
  ].join('\n');

  return truncate(body);
}

function normalizeField(field) {
  if (!field) return null;

  const name = String(field.name || field.label || '\u200b');
  const value = String(field.value ?? field.description ?? '\u200b');

  return {
    name: name === '\u200b' ? name : `◈ ${name}`,
    value: truncate(value, 1024),
    inline: Boolean(field.inline)
  };
}

/**
 * Creates a polished Sunset Ice embed used by most slash-command UIs.
 */
function createEmbed({
  title = null,
  description = null,
  color = COLORS.frost,
  fields = [],
  footer = null,
  thumbnail = null,
  image = null,
  author = null,
  timestamp = true,
  compact = false
}) {
  const embed = new EmbedBuilder().setColor(color);
  const safeAuthor = normalizeAuthor(author, color);
  const safeFooter = normalizeFooter(footer);
  const safeDescription = normalizeDescription(description, { compact, color });

  if (safeAuthor) embed.setAuthor(safeAuthor);
  if (title) embed.setTitle(String(title));
  if (safeDescription) embed.setDescription(safeDescription);

  const safeFields = (Array.isArray(fields) ? fields : [])
    .map(normalizeField)
    .filter(Boolean)
    .slice(0, 25);

  if (safeFields.length) embed.addFields(safeFields);
  if (safeFooter) embed.setFooter(safeFooter);
  if (thumbnail && cleanIcon(thumbnail)) embed.setThumbnail(cleanIcon(thumbnail));
  if (image && cleanIcon(image)) embed.setImage(cleanIcon(image));
  if (timestamp) embed.setTimestamp();

  return embed;
}

/**
 * A sleek info embed.
 */
function infoEmbed(text) {
  return createEmbed({
    title: 'Information',
    description: text,
    color: COLORS.frost
  });
}

/**
 * A sleek success embed.
 */
function successEmbed(text) {
  return createEmbed({
    title: 'Action Complete',
    description: text,
    color: COLORS.success
  });
}

/**
 * A sleek error embed.
 */
function errorEmbed(text) {
  return createEmbed({
    title: 'Action Blocked',
    description: text,
    color: COLORS.error
  });
}

module.exports = {
  COLORS,
  BRAND,
  createEmbed,
  infoEmbed,
  successEmbed,
  errorEmbed,
  e
};
