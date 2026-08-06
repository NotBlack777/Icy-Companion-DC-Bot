/**
 * Unicode defaults for the bot UI.
 *
 * These render everywhere, including DMs. Custom emoji values stored with
 * /store-emoji still take priority through uiHelper.e(), so they can be
 * swapped in later without changing command code.
 */
module.exports = {
  // Existing /bot-info keys
  success: '✅',
  settings: '⚙️',
  search: '🔍',
  rocket: '🚀',
  premium: '💎',
  loading: '⏳',
  home: '🏠',
  file: '📄',
  error: '❌',
  commands: '📚',
  info: 'ℹ️',
  ping: '📶',
  ram: '📊',
  guilds: '🏠',
  users: '👥',
  uptime: '⏱️',
  library: '🔱',
  os: '💠',
  shard: '🔮',

  // Help/navigation keys. These are Unicode until custom versions are stored.
  delete: '🗑️',
  broadcast: '📢',
  staff: '⭐',
  dmlogger: '📨',
  privacy: '🔒',
  security: '🛡️',
  moderation: '⚠️',
  locked: '🔒',
  unlocked: '🔓',
  sparkles: '✨',
  ice: '🧊',
  folder: '🗂️',
  chart: '📊',
  compass: '🧭',
  bulb: '💡',
  chat: '💬',
  sleep: '💤',
  first: '⏮️',
  previous: '◀️',
  next: '▶️',
  last: '⏭️'
};
