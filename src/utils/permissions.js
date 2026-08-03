/**
 * Permissions utility for server commands.
 *
 * Hierarchy:
 *   Super Owner (SUPER_OWNER_ID) → bypasses ALL restrictions in ANY server
 *   Server Owner                 → always allowed
 *   Bot Owner (per-server)      → allowed
 *   Extra Owners (per-server)   → allowed
 *   Ignored users/roles/channels → denied
 */

const globalStore = require('./globalStore');

function isOwner(config = {}, userId) {
  if (!userId) return false;
  return config.owner === userId || (Array.isArray(config.extraOwners) && config.extraOwners.includes(userId));
}

function isStaff(config = {}, member) {
  if (!member) return false;

  // Check virtual staff list first
  if (Array.isArray(config.virtualStaff) && config.virtualStaff.some(s => s.id === member.id)) {
    return true;
  }

  // Support multiple staff roles
  const roles = Array.isArray(config.staffRoles) && config.staffRoles.length
    ? config.staffRoles
    : config.staffRole ? [config.staffRole] : [];

  if (!roles.length) return false;
  return roles.some(roleId => member.roles?.cache?.has(roleId));
}

function isIgnored(config = {}, userId, channelId) {
  return (
    (Array.isArray(config.ignoreUsers) && config.ignoreUsers.includes(userId)) ||
    (Array.isArray(config.ignoreChannels) && channelId && config.ignoreChannels.includes(channelId))
  );
}

function isRoleIgnored(config = {}, member) {
  if (!member?.roles?.cache || !Array.isArray(config.ignoreRoles)) return false;
  return member.roles.cache.some(role => config.ignoreRoles.includes(role.id));
}

/**
 * Main permission check for server commands.
 *
 * Super Owners can run ANY command in ANY server where the bot is present,
 * even if they are not the server owner, bot owner, or even a member.
 * The bot just needs to be in the server.
 *
 * This is the core of the Super Owner bypass — they have god-mode
 * over all server commands from the DM panel.
 */
function canUseCommand(config = {}, interaction) {
  const userId    = interaction.user?.id;
  const channelId = interaction.channel?.id;
  const member    = interaction.member;

  // ─── Super Owner: bypass everything ────────────────────────────────
  if (globalStore.isSuperOwner(userId)) {
    // Super owner can use any command in any server.
    // No other checks needed — they bypass role/channel ignores too.
    return true;
  }

  // ─── Standard permission checks ────────────────────────────────────
  if (isOwner(config, userId))    return true;
  if (interaction.guild?.ownerId === userId) return true;
  if (isIgnored(config, userId, channelId))  return false;
  if (isRoleIgnored(config, member))         return false;

  return true;
}

module.exports = {
  isOwner,
  isStaff,
  isIgnored,
  isRoleIgnored,
  canUseCommand
};
