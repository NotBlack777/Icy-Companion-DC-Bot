function isOwner(config = {}, userId) {
  if (!userId) return false;
  return config.owner === userId || (Array.isArray(config.extraOwners) && config.extraOwners.includes(userId));
}

function isStaff(config = {}, member) {
  if (!member || !config.staffRole) return false;
  return Boolean(member.roles?.cache?.has(config.staffRole));
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

function canUseCommand(config = {}, interaction) {
  const userId = interaction.user?.id;
  const channelId = interaction.channel?.id;
  const member = interaction.member;

  if (isOwner(config, userId)) return true;
  if (interaction.guild?.ownerId === userId) return true;
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
