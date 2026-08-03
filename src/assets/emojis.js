/**
 * Unicode defaults for the bot UI.
 *
 * These render everywhere, including DMs. Custom emoji values stored with
 * /store-emoji still take priority through uiHelper.e(), so they can be
 * swapped in later without changing command code.
 */
module.exports = {
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
  info: 'ℹ️'
};
