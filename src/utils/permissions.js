function isOwner(config, userId) {
  return config.owner === userId ||
         config.extraOwners?.includes(userId);
}

function isStaff(config, member) {
  if (!member) return false;
  if (!config.staffRole) return false;

  return member.roles.cache.has(config.staffRole);
}

function isIgnored(config, userId, channelId) {
  return (
    config.ignoreUsers?.includes(userId) ||
    config.ignoreChannels?.includes(channelId)
  );
}

// 🚫 block commands in ignored roles
function isRoleIgnored(config, member) {
  if (!member) return false;

  return member.roles.cache.some(role =>
    config.ignoreRoles?.includes(role.id)
  );
}

// 🧠 FULL CHECK (recommended for your bot)
function canUseCommand(config, interaction) {

  const userId = interaction.user.id;
  const channelId = interaction.channel?.id;
  const member = interaction.member;

  // owner bypass
  if (isOwner(config, userId)) return true;

  // ignore checks
  if (isIgnored(config, userId, channelId)) return false;
  if (isRoleIgnored(config, member)) return false;

  return true;
}

module.exports = {
  isOwner,
  isStaff,
  isIgnored,
  isRoleIgnored,
  canUseCommand
};