function compareSnowflakeDesc(a, b) {
  try {
    const left = BigInt(a.id);
    const right = BigInt(b.id);
    if (left === right) return 0;
    return left > right ? -1 : 1;
  } catch {
    return String(b.id).localeCompare(String(a.id));
  }
}

/**
 * Discord exposes role.position from the bottom of the hierarchy upward:
 * @everyone is 0 and higher roles have larger numbers. For humans reading a
 * role-info panel, the top role should be #1, the next #2, etc.
 */
function getDisplayRolePosition(guild, role) {
  const roles = [...(guild?.roles?.cache?.values?.() || [])]
    .filter(item => item?.id && item.id !== guild.id)
    .sort((a, b) => {
      const aPos = Number(a.rawPosition ?? a.position ?? 0);
      const bPos = Number(b.rawPosition ?? b.position ?? 0);
      if (aPos !== bPos) return bPos - aPos;
      return compareSnowflakeDesc(a, b);
    });

  const index = roles.findIndex(item => item.id === role?.id);

  return {
    position: index === -1 ? null : index + 1,
    total: roles.length,
    isTop: index === 0,
    isBottom: index === roles.length - 1,
    above: index > 0 ? roles[index - 1] : null,
    below: index !== -1 && index < roles.length - 1 ? roles[index + 1] : null
  };
}

function formatRolePosition(position) {
  if (!position?.position) return 'Unknown';

  const notes = [];
  if (position.isTop) notes.push('top role');
  if (position.isBottom) notes.push('lowest role');

  return `#${position.position} of ${position.total}${notes.length ? ` • ${notes.join(', ')}` : ''}`;
}

function roleHexColor(role) {
  return role?.color
    ? `#${role.color.toString(16).toUpperCase().padStart(6, '0')}`
    : 'Default';
}

module.exports = {
  getDisplayRolePosition,
  formatRolePosition,
  roleHexColor
};
