/**
 * DM command registry
 * -------------------
 * Single source of truth for every Super Owner DM command.
 *
 * Each entry drives three things at once:
 *   1. The `@bot help` panel (grouping, usage strings, ordering).
 *   2. Mention parsing  -> `@bot kick #1 12345 reason`
 *   3. Slash execution  -> `/kick server:#1 user:12345 reason:...`
 *
 * Because both paths run the same `run()` function, `/` and `@bot` can
 * never drift apart.
 *
 * Fields
 *   name      command word
 *   aliases   alternative words (mention path only)
 *   group     help panel section
 *   usage     shown in help
 *   desc      one line summary
 *   tier      'super' | 'owner' | 'junior'
 *   secure    requires an unlocked session when a password/TOTP is set
 *   args      positional argument spec, used for parsing + slash options
 *   run       async ({ ctx }) => payload
 */

const GROUPS = [
  { id: 'info',       label: 'Info',       emoji: '📋' },
  { id: 'delete',     label: 'Delete',     emoji: '🗑️' },
  { id: 'broadcast',  label: 'Broadcast',  emoji: '📢' },
  { id: 'management', label: 'Management', emoji: '⚙️' },
  { id: 'reports',    label: 'Reports',    emoji: '📊' },
  { id: 'staff',      label: 'Staff',      emoji: '⭐' },
  { id: 'dmlogger',   label: 'DM Logger',  emoji: '📨' },
  { id: 'privacy',    label: 'Privacy',    emoji: '🔒' },
  { id: 'security',   label: 'Security',   emoji: '🛡️' },
  { id: 'moderation', label: 'Moderation', emoji: '⚠️' }
];

const commands = new Map();

/**
 * Register a command definition.
 */
function define(definition) {
  const entry = {
    aliases: [],
    tier: 'super',
    secure: false,
    args: [],
    hidden: false,
    ...definition
  };

  commands.set(entry.name, entry);

  for (const alias of entry.aliases) {
    if (!commands.has(alias)) {
      commands.set(alias, { ...entry, isAlias: true, aliasOf: entry.name });
    }
  }

  return entry;
}

function get(name) {
  if (!name) return null;
  return commands.get(String(name).toLowerCase()) || null;
}

/**
 * All canonical (non-alias) commands.
 */
function all() {
  return [...new Set([...commands.values()].filter(cmd => !cmd.isAlias))];
}

function byGroup(groupId) {
  return all().filter(cmd => cmd.group === groupId && !cmd.hidden);
}

module.exports = { GROUPS, define, get, all, byGroup, commands };
