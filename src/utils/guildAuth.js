/**
 * Shared permission helper for in-server slash commands.
 *
 * Keeps the "owner only" / "staff only" checks identical across every
 * command instead of each file re-implementing them slightly differently.
 */

const { MessageFlags } = require('discord.js');
const { getServerConfig } = require('./configManager');
const { isOwner, isStaff } = require('./permissions');
const globalStore = require('./globalStore');

/**
 * Anyone who can administrate the bot in this guild:
 * guild owner, configured bot owner, extra owners, or a global owner.
 */
function isGuildOwner(config, interaction) {
  const userId = interaction.user.id;

  if (interaction.guild?.ownerId === userId) return true;
  if (globalStore.isGlobalOwner(userId)) return true;

  const owner = config.owner || interaction.guild?.ownerId;
  return isOwner({ ...config, owner }, userId);
}

function isGuildStaff(config, interaction) {
  if (isGuildOwner(config, interaction)) return true;
  return isStaff(config, interaction.member);
}

/**
 * Discord permissions OR bot-owner authority. Useful for commands where the
 * bot performs the action with its own permissions (purges, moderation tools),
 * so trusted bot owners do not need the matching Discord role permission.
 */
function hasGuildPermissionOrOwner(interaction, permission) {
  if (!interaction.guild) return false;
  const config = getServerConfig(interaction.guild.id);
  return isGuildOwner(config, interaction) || Boolean(interaction.memberPermissions?.has(permission));
}

/**
 * Guard a command. Returns { ok, config } or replies and returns ok:false.
 *
 * @param {object} interaction
 * @param {'any'|'staff'|'owner'} level
 */
async function guard(interaction, level = 'any') {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral
    }).catch(() => null);

    return { ok: false };
  }

  const config = getServerConfig(interaction.guild.id);

  if (level === 'owner' && !isGuildOwner(config, interaction)) {
    await interaction.reply({
      content: '❌ Owner only.',
      flags: MessageFlags.Ephemeral
    }).catch(() => null);

    return { ok: false, config };
  }

  if (level === 'staff' && !isGuildStaff(config, interaction)) {
    await interaction.reply({
      content: '❌ Staff only.',
      flags: MessageFlags.Ephemeral
    }).catch(() => null);

    return { ok: false, config };
  }

  return { ok: true, config };
}

module.exports = { guard, isGuildOwner, isGuildStaff, hasGuildPermissionOrOwner };
