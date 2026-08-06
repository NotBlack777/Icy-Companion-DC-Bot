/**
 * Shared executor
 * ---------------
 * Both entry points funnel through here:
 *
 *   messageCreate  -> `@bot kick #1 123 spam`
 *   interaction    -> `/kick server:#1 user:123 reason:spam`
 *
 * Responsibilities: permission tier, lock state, argument errors,
 * and turning any thrown error into a readable embed.
 */

const ui = require('./ui');
const store = require('../utils/globalStore');
const { recordAudit } = require('../utils/auditLog');

/**
 * Check whether a user may run a command right now.
 */
function authorize(command, userId) {
  if (!store.hasTier(userId, command.tier)) {
    // Deliberately vague - do not confirm the command exists to strangers.
    return { ok: false, silent: true };
  }

  const needsUnlock =
    command.secure &&
    (store.isLocked() || store.hasPassword() || store.getSecurity().totpSecret);

  if (needsUnlock && store.isLocked() && !store.isSessionUnlocked(userId)) {
    return {
      ok: false,
      embed: ui.error('Locked', [
        `\`${command.name}\` is a secured command and the bot is locked.`,
        '',
        'Unlock with `@bot unlock <password>` or a TOTP code.'
      ].join('\n'))
    };
  }

  return { ok: true };
}

/**
 * Run a registry command and always return a message payload.
 *
 * @param {object} command Registry entry.
 * @param {object} ctx     { client, user, channel, message?, interaction?, source }
 * @param {object} args    Bound arguments.
 * @param {string[]} errors Argument binding errors.
 */
async function execute(command, ctx, args = {}, errors = []) {
  const auth = authorize(command, ctx.user.id);

  if (!auth.ok) {
    if (auth.silent) return null;
    return { embeds: [auth.embed] };
  }

  if (errors.length) {
    return {
      embeds: [ui.error('Invalid usage', [
        errors.map(err => `> ${err}`).join('\n'),
        '',
        `**Usage:** \`${command.usage}\``
      ].join('\n'))]
    };
  }

  try {
    const result = await command.run({ ctx, args });

    if (command.secure || ['super', 'owner'].includes(command.tier)) {
      recordAudit({
        surface: ctx.source || 'dm',
        command: command.name,
        group: command.group,
        tier: command.tier,
        secure: Boolean(command.secure),
        userId: ctx.user?.id,
        guildId: ctx.guild?.id || null,
        channelId: ctx.channel?.id || null,
        status: 'ok'
      });
    }

    // Commands may return nothing when they handle their own replies.
    return result || null;
  } catch (err) {
    console.error(`[DM CMD] ${command.name} failed:`, err);
    recordAudit({
      surface: ctx.source || 'dm',
      command: command.name,
      group: command.group,
      tier: command.tier,
      secure: Boolean(command.secure),
      userId: ctx.user?.id,
      guildId: ctx.guild?.id || null,
      channelId: ctx.channel?.id || null,
      status: 'error',
      error: String(err.message || err).slice(0, 300)
    });

    return {
      embeds: [ui.error('Command failed', [
        `\`${command.name}\` threw an error.`,
        '',
        `\`\`\`\n${String(err.message || err).slice(0, 500)}\n\`\`\``
      ].join('\n'))]
    };
  }
}

module.exports = { execute, authorize };
