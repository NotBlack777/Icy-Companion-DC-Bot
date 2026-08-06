/**
 * ═══════════════════════════════════════════════════════════════
 *   ICY COMPANION — Sunset Ice DM UI System
 *   Orange-sky-to-icy-blue embeds for owner control panels.
 * ═══════════════════════════════════════════════════════════════
 */

const { EmbedBuilder } = require('discord.js');

const { createColorProxy, getTheme } = require('../utils/themeManager');

// ─── Icy Color Palette ────────────────────────────────────────────
const ICY = createColorProxy();

// ─── Decorative Constants ──────────────────────────────────────────
function divider() { return getTheme().divider; }
function thinDivider() { return getTheme().thin; }
function glowLine() { return getTheme().glow; }
const CORNER_TL = '╭';
const CORNER_TR = '╮';
const CORNER_BL = '╰';
const CORNER_BR = '╯';
const BAR_FULL  = '▰';
const BAR_EMPTY = '▱';

const TIER_BADGES = {
  super:  '👑',
  owner:  '⭐',
  junior: '🔹',
};

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

function tone(color) {
  if (color === ICY.success || color === ICY.mint) return { icon: '✅', label: 'Success' };
  if (color === ICY.error || color === ICY.lava || color === ICY.pink) return { icon: '⛔', label: 'Alert' };
  if (color === ICY.warn || color === ICY.amber) return { icon: '⚠️', label: 'Notice' };
  if (color === ICY.violet || color === ICY.amber) return { icon: '🌅', label: 'Sunset' };
  return { icon: '🧊', label: 'Control' };
}

// ─── Base Embed Builder ───────────────────────────────────────────
function base(color = ICY.frost, options = {}) {
  const { author = null, footer = null } = options;
  const mood = tone(color);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();

  embed.setAuthor({
    name: author?.name || `${mood.icon} Icy Companion • ${mood.label} Panel`,
    iconURL: cleanIcon(author?.iconURL)
  });

  embed.setFooter({
    text: footer || getTheme().footer,
    iconURL: undefined
  });

  return embed;
}

function normalizeBody(body) {
  return (Array.isArray(body) ? body : [String(body)]).filter(item => item !== null && item !== undefined);
}

function formatDescription(lines, { color = ICY.frost, compact = false, noDivider = false } = {}) {
  const mood = tone(color);
  const body = lines.filter(Boolean).map(String);

  if (compact) return truncate(body.join('\n'));

  const out = [
    `> ${mood.icon} **${getTheme().interfaceName}**`,
    divider(),
    ...body
  ];

  if (!noDivider) out.push(thinDivider());
  return truncate(out.join('\n'));
}

// ─── Sunset Ice Panel — Signature DM Card ─────────────────────────
/**
 * Build a rich, futuristic panel embed.
 * title    — main title (supports emoji prefix)
 * body     — array of field objects or string lines
 * options  — { color, author, thumbnail, footer, compact, noDivider }
 *
 * field: { name/label, value, inline? }  OR  string line
 */
function panel(title, body = [], options = {}) {
  const items = normalizeBody(body);
  const {
    color = ICY.frost,
    author = null,
    thumbnail = null,
    footer = null,
    compact = false,
    noDivider = false,
  } = options;

  const embed = base(color, { author, footer });
  const mood = tone(color);
  const lines = [];

  embed.setTitle(`${mood.icon} ${title}`);

  for (const item of items) {
    if (typeof item === 'string') {
      lines.push(item);
    } else if (item && typeof item === 'object') {
      const name = item.name || item.label;
      if (name && item.value !== undefined) {
        embed.addFields({
          name:  `◈ ${name}`,
          value: truncate(item.value, 1024),
          inline: Boolean(item.inline),
        });
      }
    }
  }

  if (lines.length) {
    embed.setDescription(formatDescription(lines, { color, compact, noDivider }));
  }

  if (thumbnail) {
    const thumb = typeof thumbnail === 'string' ? thumbnail : thumbnail.url;
    if (cleanIcon(thumb)) embed.setThumbnail(cleanIcon(thumb));
  }

  return embed;
}

// ─── Simple Panels ────────────────────────────────────────────────
function success(title, description) {
  return panel(title, [description], { color: ICY.success });
}

function error(title, description) {
  return panel(title, [description], { color: ICY.error });
}

function warn(title, description) {
  return panel(title, [description], { color: ICY.warn });
}

function info(title, description) {
  return panel(title, [description], { color: ICY.info });
}

// ─── Status Embed ─────────────────────────────────────────────────
/**
 * A polished status panel with sections.
 * sections: [{ title, color, rows: { key: value } }]
 */
function status(title, sections = [], options = {}) {
  const { thumbnail = null, footer = null } = options;
  const embed = base(ICY.frost, { footer });

  embed.setTitle(`❄️ ${title}`);
  embed.setDescription(formatDescription([
    '**Live status overview**',
    '> Values below are pulled from the current bot runtime/config.'
  ], { color: ICY.frost }));

  if (thumbnail) {
    const thumb = typeof thumbnail === 'string' ? thumbnail : thumbnail.url;
    if (cleanIcon(thumb)) embed.setThumbnail(cleanIcon(thumb));
  }

  for (const section of sections) {
    const rows = section.rows || {};
    const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
    if (!entries.length) continue;

    embed.addFields({
      name: `◈ ${section.title}`,
      value: miniTable(Object.fromEntries(entries)),
      inline: false,
    });
  }

  return embed;
}

// ─── Code Table ───────────────────────────────────────────────────
/**
 * Render an object as a nicely-styled code block.
 * { key: value, ... }  →  monospaced table
 */
function codeTable(rows) {
  const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
  if (!entries.length) return '```\n(empty)\n```';

  const maxKey = Math.max(...entries.map(([k]) => String(k).length));
  const lines = entries.map(([key, val]) => {
    const k = String(key).padEnd(maxKey, ' ');
    return `${k} │ ${val}`;
  });

  return `\`\`\`\n${lines.join('\n')}\n\`\`\``;
}

// ─── Mini Table (inline, for field values) ───────────────────────
/**
 * Render a compact key→value list using inline code.
 */
function miniTable(rows) {
  const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
  if (!entries.length) return '_none_';
  return entries
    .map(([k, v]) => `**${k}**\n> ${v}`)
    .join('\n');
}

// ─── Bullet List ─────────────────────────────────────────────────
function bullet(lines) {
  return lines
    .filter(Boolean)
    .map(line => `> • ${line}`)
    .join('\n');
}

// ─── Chunks ──────────────────────────────────────────────────────
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

// ─── Progress Bar ───────────────────────────────────────────────
function progressBar(current, max, width = 10) {
  const safeMax = Math.max(Number(max) || 1, 1);
  const ratio = Math.min(Math.max((Number(current) || 0) / safeMax, 0), 1);
  const filled = Math.round(ratio * width);
  const empty  = width - filled;
  return `${BAR_FULL.repeat(filled)}${BAR_EMPTY.repeat(empty)}`;
}

// ─── Pad Title ───────────────────────────────────────────────────
function icyTitle(text, width = 42) {
  const inner = ` ✦ ${String(text).toUpperCase()} ✦ `;
  const pad   = Math.max(0, Math.floor((width - inner.length) / 2));
  return `${'─'.repeat(pad)}${inner}${'─'.repeat(Math.max(0, width - pad - inner.length))}`;
}

// ─── Loading Embed ───────────────────────────────────────────────
function loading(title = 'Processing...') {
  return panel(title, [
    '> ⏳ Please wait while I process this request...',
    progressBar(3, 10, 12)
  ], { color: ICY.glacier });
}

// ─── Confirm Embed ───────────────────────────────────────────────
function confirm(title, description) {
  return panel(title, [description], { color: ICY.mint });
}

// ─── Exported ────────────────────────────────────────────────────
module.exports = {
  ICY,
  COLORS: ICY,

  // Builders
  base,
  panel,
  status,

  // Simple helpers
  success,
  error,
  warn,
  info,
  loading,
  confirm,

  // Utilities
  codeTable,
  miniTable,
  bullet,
  chunk,
  truncate,
  progressBar,
  icyTitle,

  // Constants
  get DIVIDER() { return divider(); },
  get THIN_DIV() { return thinDivider(); },
  get GLOW_LINE() { return glowLine(); },
  BAR_FULL,
  BAR_EMPTY,
  CORNER_TL,
  CORNER_TR,
  CORNER_BL,
  CORNER_BR,
  TIER_BADGES,
};
