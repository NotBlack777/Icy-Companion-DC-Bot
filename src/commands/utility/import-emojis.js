const { SlashCommandBuilder } = require('discord.js');
const globalStore = require('../../utils/globalStore');

const EMOJI_ALIASES = {
  success: ['success', 'success_icon', 'check', 'check_icon'],
  settings: ['settings', 'settings_icon', 'gear', 'gear_icon'],
  search: ['search', 'search_icon', 'lookup'],
  rocket: ['rocket', 'rocket_icon'],
  premium: ['premium', 'premium_icon', 'diamond', 'gem'],
  loading: ['loading', 'loading_icon', 'spinner'],
  home: ['home', 'home_icon'],
  file: ['file', 'file_icon', 'document'],
  error: ['error', 'error_icon', 'cross', 'x'],
  commands: ['commands', 'commands_icon', 'command', 'list'],
  info: ['info', 'info_icon'],
  ping: ['ping', 'ping_icon', 'wifi', 'latency'],
  ram: ['ram', 'ram_icon', 'memory', 'stats'],
  guilds: ['guilds', 'guilds_icon', 'server', 'servers'],
  users: ['users', 'users_icon', 'members', 'member'],
  uptime: ['uptime', 'uptime_icon', 'clock', 'timer'],
  library: ['library', 'library_icon', 'discordjs', 'lib'],
  os: ['os', 'os_icon', 'system', 'linux'],
  shard: ['shard', 'shard_icon', 'crystal', 'gem'],

  delete: ['delete', 'delete_icon', 'trash', 'trash_icon'],
  broadcast: ['broadcast', 'broadcast_icon', 'announce', 'megaphone'],
  staff: ['staff', 'staff_icon', 'star'],
  dmlogger: ['dm_logger', 'dm_logger_icon', 'dmlogger', 'mail'],
  privacy: ['privacy', 'privacy_icon', 'lock'],
  security: ['security', 'security_icon', 'shield'],
  moderation: ['moderation', 'moderation_icon', 'warning', 'warn'],
  locked: ['locked', 'locked_icon'],
  unlocked: ['unlocked', 'unlocked_icon'],
  sparkles: ['sparkles', 'sparkles_icon', 'magic'],
  ice: ['ice', 'ice_icon', 'snowflake', 'frost'],
  folder: ['folder', 'folder_icon'],
  chart: ['chart', 'chart_icon', 'reports', 'report'],
  compass: ['compass', 'compass_icon', 'navigation'],
  bulb: ['bulb', 'bulb_icon', 'idea', 'tip'],
  chat: ['chat', 'chat_icon', 'message'],
  sleep: ['sleep', 'sleep_icon', 'empty'],
  first: ['first', 'first_page', 'arrow_first', 'double_left', 'skip_back'],
  previous: ['previous', 'prev', 'arrow_left', 'left_arrow'],
  next: ['next', 'next_page', 'arrow_right', 'right_arrow'],
  last: ['last', 'last_page', 'arrow_last', 'double_right', 'skip_forward']
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findEmoji(emojis, aliases) {
  const names = new Set(aliases.map(normalize));
  return emojis.find(emoji => names.has(normalize(emoji.name))) || null;
}

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('import-emojis')
    .setDescription('Import the bot UI emojis from this server'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Run this command in the server that contains your custom UI emojis.',
        ephemeral: true
      });
    }

    if (!globalStore.isSuperOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ This command is restricted to the Super Owner.',
        ephemeral: true
      });
    }

    const emojis = [...interaction.guild.emojis.cache.values()];
    const imported = [];
    const missing = [];
    const values = {};

    for (const [key, aliases] of Object.entries(EMOJI_ALIASES)) {
      const emoji = findEmoji(emojis, aliases);

      if (!emoji) {
        missing.push(key);
        continue;
      }

      values[key] = emoji.toString();
      imported.push(`${emoji} ` + '`' + key + '`');
    }

    if (Object.keys(values).length) {
      globalStore.update(data => {
        data.emojis = { ...(data.emojis || {}), ...values };
      });
    }

    const missingText = missing.length
      ? `\n**Not found:** ${missing.map(key => '`' + key + '`').join(', ')}`
      : '';

    return interaction.reply({
      embeds: [{
        color: imported.length ? 0x00f5a0 : 0xffaa00,
        title: imported.length ? '✅ UI Emojis Imported' : '⚠️ No Matching Emojis Found',
        description: [
          imported.length
            ? `Imported **${imported.length}** emoji${imported.length === 1 ? '' : 's'} from **${interaction.guild.name}**.`
            : `I could not match the expected UI names in **${interaction.guild.name}**.`,
          '',
          imported.length ? imported.slice(0, 25).join(' • ') : '',
          missingText,
          '',
          'These values now override the Unicode fallbacks in `/bot-info`, `/help`, and the DM help panel.'
        ].filter(Boolean).join('\n')
      }],
      ephemeral: true
    });
  }
};

module.exports.EMOJI_ALIASES = EMOJI_ALIASES;
module.exports.normalize = normalize;
module.exports.findEmoji = findEmoji;
