/**
 * ═══════════════════════════════════════════════════════════════
 *   ICY COMPANION — Futuristic Icy UI System
 *   Sleek, neon, cyberpunk-inspired embed builder
 * ═══════════════════════════════════════════════════════════════
 */

const { EmbedBuilder } = require('discord.js');

// ─── Icy Color Palette ────────────────────────────────────────────
const ICY = {
  // Core
  frost:       0x00d4ff,  // Bright icy cyan — primary brand
  glacier:     0x00b4d8,  // Deep arctic blue — secondary
  midnight:    0x0a1628,  // Dark navy — background tint
  deepIce:     0x030f1a,  // Near-black arctic — darkest

  // Accents
  neon:        0x7df9ff,  // Neon ice — highlights
  violet:      0x9b5de5,  // Violet accent — contrast
  pink:        0xf72585,  // Hot pink — errors / alerts
  mint:        0x00f5d4,  // Mint — success
  amber:       0xffd60a,  // Amber — warnings
  lava:        0xff4d6d,  // Lava red — danger/fail

  // Functional
  success:     0x00f5a0,  // Neon green — success
  error:       0xff3d71,  // Neon red — error
  warn:        0xffaa00,  // Neon orange — warning
  info:        0x00d4ff,  // Icy blue — info
  brand:       0x00c8ff,  // Brand blue

  // Text
  white:       0xffffff,
  lightGray:   0xb8c5d6,
  dimGray:     0x5a6a7a,
};

// ─── Decorative Constants ──────────────────────────────────────────
const DIVIDER   = '─'.repeat(42);
const THIN_DIV  = '─'.repeat(42);
const GLOW_LINE = '═'.repeat(42);
const CORNER_TL = '┌';
const CORNER_TR = '┐';
const CORNER_BL = '└';
const CORNER_BR = '┘';
const BAR_FULL  = '█';
const BAR_EMPTY = '░';

// ─── Base Embed Builder ───────────────────────────────────────────
function base(color = ICY.frost) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: '✦ Icy Companion' })
    .setFooter({
      text: '✦ Icy Companion',
      iconURL: undefined
    });
}

// ─── Tier Badges ──────────────────────────────────────────────────
const TIER_BADGES = {
  super:  '👑',
  owner:  '⭐',
  junior: '🔹',
};

// ─── Icy Panel — The signature block embed ──────────────────────
/**
 * Build a rich, futuristic panel embed.
 * title    — main title (supports emoji prefix)
 * body     — array of field objects or string lines
 * options  — { color, author, thumbnail, footer, compact, noDivider }
 *
 * field: { label, value, inline? }  OR  string line
 */
function panel(title, body = [], options = {}) {
  const {
    color = ICY.frost,
    author = null,       // { name, iconURL }
    thumbnail = null,
    footer = null,       // string override
    compact = false,
    noDivider = false,
  } = options;

  const embed = base(color);

  if (author) {
    embed.setAuthor({
      name: author.name || 'Icy Companion',
      iconURL: author.iconURL || undefined,
    });
  }

  embed.setTitle(`❄️ ${title}`);

  // Build description: header + body + footer
  const lines = [];

  // Header line
  if (!compact) {
    lines.push(`\`\`\`\n${GLOW_LINE}\`\`\``);
  }

  // Body
  for (const item of body) {
    if (typeof item === 'string') {
      lines.push(item);
    } else if (item && typeof item === 'object') {
      if (item.name && item.value !== undefined) {
        embed.addFields({
          name:  `⸩ ${item.name}`,
          value: String(item.value),
          inline: item.inline || false,
        });
      }
    }
  }

  if (!compact && !noDivider) {
    lines.push(`\`\`\`\n${GLOW_LINE}\`\`\``);
  }

  if (lines.length) {
    embed.setDescription(lines.join('\n'));
  }

  if (thumbnail) {
    if (typeof thumbnail === 'string') embed.setThumbnail(thumbnail);
    else embed.setThumbnail(thumbnail.url || thumbnail);
  }

  if (footer) {
    embed.setFooter({
      text: footer,
      iconURL: undefined,
    });
  }

  return embed;
}

// ─── Simple Success ───────────────────────────────────────────────
function success(title, description) {
  return panel(title, [description], {
    color: ICY.success,
  });
}

// ─── Simple Error ─────────────────────────────────────────────────
function error(title, description) {
  return panel(title, [description], {
    color: ICY.error,
  });
}

// ─── Simple Warning ───────────────────────────────────────────────
function warn(title, description) {
  return panel(title, [description], {
    color: ICY.warn,
  });
}

// ─── Simple Info ──────────────────────────────────────────────────
function info(title, description) {
  return panel(title, [description], {
    color: ICY.info,
  });
}

// ─── Status Embed ─────────────────────────────────────────────────
/**
 * A polished status panel with sections.
 * sections: [{ title, color, rows: { key: value } }]
 */
function status(title, sections = [], options = {}) {
  const { thumbnail = null } = options;
  const body = [];
  const embed = base(ICY.frost);

  embed.setTitle(`❄️ ${title}`);
  embed.setAuthor({
    name: '✦ Icy Companion Panel',
    iconURL: undefined,
  });

  if (thumbnail) {
    const thumb = typeof thumbnail === 'string' ? thumbnail : thumbnail.url;
    if (thumb) embed.setThumbnail(thumb);
  }

  for (const section of sections) {
    const secColor = section.color || ICY.glacier;
    const rows = section.rows || {};
    const entries = Object.entries(rows).filter(([, v]) => v !== undefined);

    if (!entries.length) continue;

    const maxKey = Math.max(...entries.map(([k]) => k.length));
    const tableLines = entries.map(([key, val]) => {
      const padded = key.padEnd(maxKey, ' ');
      return `  ${padded}  │  ${val}`;
    });

    const table = [
      `\`\`\`\n  ⚡ ${section.title.toUpperCase()}`,
      `  ${'─'.repeat(maxKey + 16)}`,
      ...tableLines,
      `\`\`\``
    ].join('\n');

    embed.addFields({
      name: '\u2800', // zero-width space — invisible spacer
      value: table,
      inline: false,
    });
  }

  embed.setFooter({ text: '✦ Icy Companion' });
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
  const maxVal = Math.max(...entries.map(([, v]) => String(v).length));

  const lines = entries.map(([key, val]) => {
    const k = String(key).padEnd(maxKey, ' ');
    const v = String(val).padEnd(maxVal, ' ');
    return `${k}  │  ${v}`;
  });

  const sep = `${'─'.repeat(maxKey)}─┼─${'─'.repeat(maxVal)}`;
  return `\`\`\`\n${sep}\n${lines.join('\n')}\n\`\`\``;
}

// ─── Mini Table (inline, for field values) ───────────────────────
/**
 * Render a compact key→value list using inline code.
 */
function miniTable(rows) {
  const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
  if (!entries.length) return '_none_';
  return entries
    .map(([k, v]) => `\`${k}\` → **${v}**`)
    .join('\n');
}

// ─── Bullet List ─────────────────────────────────────────────────
function bullet(lines) {
  return lines
    .filter(Boolean)
    .map(line => `> ${line}`)
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

// ─── Truncate ────────────────────────────────────────────────────
function truncate(text, max = 1000) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

// ─── Progress Bar ───────────────────────────────────────────────
function progressBar(current, max, width = 10) {
  const filled = Math.round((current / max) * width);
  const empty  = width - filled;
  return `${BAR_FULL.repeat(filled)}${BAR_EMPTY.repeat(empty)}`;
}

// ─── Pad Title ───────────────────────────────────────────────────
function icyTitle(text, width = 42) {
  const inner = ` ✦ ${text.toUpperCase()} ✦ `;
  const pad   = Math.max(0, Math.floor((width - inner.length) / 2));
  return `${'─'.repeat(pad)}${inner}${'-'.repeat(width - pad - inner.length)}`;
}

// ─── Loading Embed ───────────────────────────────────────────────
function loading(title = 'Processing...') {
  return panel(title, [
    '```\n  ⏳ Please wait...\n```',
  ], { color: ICY.glacier });
}

// ─── Confirm Embed ───────────────────────────────────────────────
function confirm(title, description) {
  return panel(`✅ ${title}`, [description], {
    color: ICY.mint,
  });
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
  DIVIDER,
  THIN_DIV,
  GLOW_LINE,
  BAR_FULL,
  BAR_EMPTY,
};
