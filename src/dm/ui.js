/**
 * Shared embed helpers for DM commands, so every response looks the same
 * whether it came from `/` or from `@bot`.
 */

const { EmbedBuilder } = require('discord.js');

const COLORS = {
  brand: 0x7dd3fc,
  success: 0x57f287,
  error: 0xed4245,
  warn: 0xfee75c,
  info: 0x5865f2
};

function base(color) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function success(title, description) {
  return base(COLORS.success).setTitle(`✅ ${title}`).setDescription(description || null);
}

function error(title, description) {
  return base(COLORS.error).setTitle(`❌ ${title}`).setDescription(description || null);
}

function warn(title, description) {
  return base(COLORS.warn).setTitle(`⚠️ ${title}`).setDescription(description || null);
}

function info(title, description) {
  return base(COLORS.brand).setTitle(title).setDescription(description || null);
}

/**
 * Render an object as an aligned code block, used by config/status views.
 */
function codeTable(rows) {
  const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
  if (!entries.length) return '```\n(empty)\n```';

  const width = Math.max(...entries.map(([k]) => k.length));

  const body = entries
    .map(([key, value]) => `${key.padEnd(width)} : ${value}`)
    .join('\n');

  return `\`\`\`\n${body}\n\`\`\``;
}

function bullet(lines) {
  return lines.filter(Boolean).map(line => `> ${line}`).join('\n');
}

/**
 * Split long content into embed-safe chunks (4096 char description limit).
 */
function chunk(lines, limit = 3900) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + line + '\n').length > limit) {
      chunks.push(current.trimEnd());
      current = '';
    }
    current += `${line}\n`;
  }

  if (current.trim()) chunks.push(current.trimEnd());
  return chunks.length ? chunks : ['(nothing to show)'];
}

function truncate(text, max = 1000) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

module.exports = { COLORS, base, success, error, warn, info, codeTable, bullet, chunk, truncate };
