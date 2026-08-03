/**
 * Helpers for profile media commands.
 *
 * Discord only includes a user's banner after the user is fetched, so every
 * media command refreshes the target before building its links.
 */

async function fetchUser(user) {
  if (!user?.fetch) return user;
  return user.fetch().catch(() => user);
}

function avatarUrl(user, options = {}) {
  return user?.displayAvatarURL?.({
    size: 1024,
    forceStatic: false,
    ...options
  }) || null;
}

function bannerUrl(user, options = {}) {
  return user?.bannerURL?.({
    size: 1024,
    forceStatic: false,
    ...options
  }) || null;
}

function isAnimatedHash(hash) {
  return typeof hash === 'string' && hash.startsWith('a_');
}

function gifAvatarUrl(user) {
  if (!isAnimatedHash(user?.avatar)) return null;
  return avatarUrl(user, { extension: 'gif' });
}

function gifBannerUrl(user) {
  if (!isAnimatedHash(user?.banner)) return null;
  return bannerUrl(user, { extension: 'gif' });
}

function userName(user) {
  return user?.tag || user?.globalName || user?.username || 'Unknown user';
}

function requestedBy(interaction) {
  return interaction.user?.tag || interaction.user?.username || 'Unknown user';
}

module.exports = {
  fetchUser,
  avatarUrl,
  bannerUrl,
  gifAvatarUrl,
  gifBannerUrl,
  isAnimatedHash,
  userName,
  requestedBy
};
