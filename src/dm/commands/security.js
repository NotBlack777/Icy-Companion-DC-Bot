/**
 * Security commands: setpassword, unlock, lock, setup-totp,
 * addowner, removeowner, addjunior, removejunior, ownerlist.
 */

const registry = require('../registry');
const ui = require('../ui');
const store = require('../../utils/globalStore');
const totp = require('../../utils/totp');

/* ---------------- SETPASSWORD ---------------- */

registry.define({
  name: 'setpassword',
  aliases: ['setpass'],
  group: 'security',
  usage: '@bot setpassword <password>',
  desc: 'Set the master password',
  args: [{ name: 'password', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const password = String(args.password).trim();

    if (password.length < 6) {
      return { embeds: [ui.error('Too short', 'The password must be at least 6 characters.')] };
    }

    store.setPassword(password);
    store.unlockSession(ctx.user.id);

    // Delete the plaintext password from the channel if we can.
    let scrubbed = false;

    if (ctx.message) {
      try {
        await ctx.message.delete();
        scrubbed = true;
      } catch {
        // DMs from users cannot be deleted by bots - expected.
      }
    }

    return {
      embeds: [ui.success('Password Set', ui.bullet([
        'The master password is stored as a salted scrypt hash.',
        'Use `@bot lock` to lock the bot and `@bot unlock <password>` to unlock.',
        scrubbed
          ? 'Your message was deleted for safety.'
          : '⚠️ Delete your message manually — the bot cannot remove user DMs.'
      ]))]
    };
  }
});

/* ---------------- UNLOCK ---------------- */

registry.define({
  name: 'unlock',
  group: 'security',
  usage: '@bot unlock <password>',
  desc: 'Unlock secured commands',
  args: [{ name: 'password', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const secret = store.getSecurity();
    const input = String(args.password).trim();

    if (!secret.passwordHash && !secret.totpSecret) {
      return { embeds: [ui.warn('Nothing to unlock', 'No password or TOTP is configured. Set one with `@bot setpassword <password>`.')] };
    }

    // Accept either the master password or a valid 6-digit TOTP code.
    const passwordOk = secret.passwordHash && store.verifyPassword(input);
    const totpOk = secret.totpSecret && totp.verifyToken(secret.totpSecret, input);

    if (!passwordOk && !totpOk) {
      console.warn(`[SECURITY] Failed unlock attempt by ${ctx.user.tag} (${ctx.user.id})`);
      return { embeds: [ui.error('Incorrect', 'That password or code is not valid.')] };
    }

    store.setLocked(false);
    store.unlockSession(ctx.user.id);

    if (ctx.message) {
      await ctx.message.delete().catch(() => null);
    }

    return {
      embeds: [ui.success('Unlocked', ui.bullet([
        `Verified via **${totpOk ? 'TOTP code' : 'password'}**.`,
        'Secured commands are available for the next **30 minutes**.'
      ]))]
    };
  }
});

/* ---------------- LOCK ---------------- */

registry.define({
  name: 'lock',
  group: 'security',
  usage: '@bot lock',
  desc: 'Lock all secured commands',
  async run() {
    if (!store.hasPassword() && !store.getSecurity().totpSecret) {
      return { embeds: [ui.warn('No credentials', 'Set a password first with `@bot setpassword <password>`, otherwise you will lock yourself out.')] };
    }

    store.setLocked(true);

    return {
      embeds: [ui.success('Locked', 'All secured commands now require `@bot unlock <password>` first. Active sessions were revoked.')]
    };
  }
});

/* ---------------- SETUP TOTP ---------------- */

registry.define({
  name: 'setup-totp',
  aliases: ['setuptotp', 'totp'],
  group: 'security',
  usage: '@bot setup-totp [code]',
  desc: 'Enable 2FA with an authenticator app',
  args: [{ name: 'code', type: 'word', required: false }],
  async run({ ctx, args }) {
    const security = store.getSecurity();

    // Step 2: confirm a pending secret with a code from the app.
    if (args.code) {
      const pending = security.totpPending;

      if (!pending) {
        return { embeds: [ui.error('No pending setup', 'Run `@bot setup-totp` first to generate a secret.')] };
      }

      if (!totp.verifyToken(pending, args.code)) {
        return { embeds: [ui.error('Invalid code', 'That code did not match. Codes rotate every 30 seconds — try the current one.')] };
      }

      store.setTotpSecret(pending);
      store.unlockSession(ctx.user.id);

      if (ctx.message) await ctx.message.delete().catch(() => null);

      return {
        embeds: [ui.success('TOTP Enabled', ui.bullet([
          'Two-factor authentication is now active.',
          'Unlock with `@bot unlock <6-digit code>`.',
          'Your master password still works as a backup.'
        ]))]
      };
    }

    // Step 1: generate and show a new secret.
    const secret = totp.generateSecret();
    store.setTotpPending(secret);

    const url = totp.buildOtpAuthUrl(secret, { label: ctx.user.tag, issuer: 'Icy Companion' });
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

    return {
      embeds: [ui.info('🛡️ TOTP Setup', ui.bullet([
        '**1.** Scan the QR code below with Google Authenticator, Authy or 1Password.',
        '**2.** Or enter the key manually.',
        '**3.** Confirm with `@bot setup-totp <6-digit code>`.'
      ]))
        .addFields({ name: 'Secret key', value: `\`\`\`\n${secret}\n\`\`\`` })
        .setImage(qr)
        .setFooter({ text: 'This secret is not active until you confirm a code.' })]
    };
  }
});

/* ---------------- OWNERS ---------------- */

registry.define({
  name: 'addowner',
  group: 'security',
  usage: '@bot addowner <user id>',
  desc: 'Grant global owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isSuperOwner(userId)) {
      return { embeds: [ui.warn('Already Super Owner', 'That user already has the highest access level.')] };
    }

    if (store.isGlobalOwner(userId)) {
      return { embeds: [ui.warn('Already an owner', `<@${userId}> is already a global owner.`)] };
    }

    store.addOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Owner Added', `${user ? `**${user.tag}**` : `<@${userId}>`} now has global owner access.`)]
    };
  }
});

registry.define({
  name: 'removeowner',
  group: 'security',
  usage: '@bot removeowner <user id>',
  desc: 'Revoke global owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isSuperOwner(userId)) {
      return { embeds: [ui.error('Cannot remove', 'The Super Owner cannot be removed.')] };
    }

    if (!store.isGlobalOwner(userId)) {
      return { embeds: [ui.warn('Not an owner', `<@${userId}> is not a global owner.`)] };
    }

    store.removeOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Owner Removed', `${user ? `**${user.tag}**` : `<@${userId}>`} no longer has global owner access.`)]
    };
  }
});

registry.define({
  name: 'addjunior',
  group: 'security',
  usage: '@bot addjunior <user id>',
  desc: 'Grant junior owner access (read-only)',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isJuniorOwner(userId)) {
      return { embeds: [ui.warn('Already junior', `<@${userId}> is already a junior owner.`)] };
    }

    store.addJunior(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Junior Owner Added', ui.bullet([
        `${user ? `**${user.tag}**` : `<@${userId}>`} can now use read-only DM commands.`,
        'Junior owners cannot kick, ban, broadcast or change security settings.'
      ]))]
    };
  }
});

registry.define({
  name: 'removejunior',
  group: 'security',
  usage: '@bot removejunior <user id>',
  desc: 'Revoke junior owner access',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (!store.isJuniorOwner(userId)) {
      return { embeds: [ui.warn('Not a junior owner', `<@${userId}> is not a junior owner.`)] };
    }

    store.removeJunior(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Junior Owner Removed', `${user ? `**${user.tag}**` : `<@${userId}>`} no longer has junior access.`)]
    };
  }
});

registry.define({
  name: 'ownerlist',
  aliases: ['owners'],
  group: 'security',
  usage: '@bot ownerlist',
  desc: 'List all owners and junior owners',
  tier: 'junior',
  async run({ ctx }) {
    const data = store.load();

    async function label(userId) {
      const user = await ctx.client.users.fetch(userId).catch(() => null);
      return user ? `**${user.tag}** \`${userId}\`` : `\`${userId}\``;
    }

    const lines = [];

    lines.push('**👑 Super Owner**');
    lines.push(data.superOwner ? `> ${await label(data.superOwner)}` : '> _not set_');

    lines.push('', `**⭐ Global Owners (${data.owners.length})**`);
    if (data.owners.length) {
      for (const id of data.owners) lines.push(`> ${await label(id)}`);
    } else {
      lines.push('> _none_');
    }

    lines.push('', `**🔹 Junior Owners (${data.juniorOwners.length})**`);
    if (data.juniorOwners.length) {
      for (const id of data.juniorOwners) lines.push(`> ${await label(id)}`);
    } else {
      lines.push('> _none_');
    }

    return { embeds: [ui.info('👑 Owner List', lines.join('\n'))] };
  }
});

module.exports = {};
