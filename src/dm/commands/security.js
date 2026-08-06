/**
 * Security commands: setpassword, unlock, lock, setup-totp,
 * addowner, removeowner, addjunior, removejunior, ownerlist.
 *
 * Icy futuristic UI.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const store     = require('../../utils/globalStore');
const totp      = require('../../utils/totp');

const { ICY } = ui;

function icyDivider() {
  return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``;
}

// ─── SETPASSWORD ──────────────────────────────────────────────────
registry.define({
  name: 'setpassword',
  aliases: ['setpass'],
  group: 'security',
  usage: '@bot setpassword <password>',
  desc: 'Set the master password',
  args: [{ name: 'password', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const password = String(args.password).trim();
    if (password.length < 6)
      return { embeds: [ui.error('Too Short', 'The password must be at least 6 characters.')] };

    store.setPassword(password);
    store.unlockSession(ctx.user.id);

    let scrubbed = false;
    if (ctx.message) {
      try { await ctx.message.delete(); scrubbed = true; } catch { /* DMs can't be deleted by bots */ }
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔐 Password Set')
        .setDescription([
          icyDivider(),
          ui.codeTable({ Status: '✅ Active', Algorithm: 'scrypt (salted hash)' }),
          '',
          ui.bullet([
            'The master password is stored as a **salted scrypt hash** — never plaintext.',
            'Use `@bot lock` to lock the bot and `@bot unlock <password>` to unlock.',
            scrubbed ? '✅ Your message was deleted for safety.' : '⚠️ Delete your message manually — the bot cannot remove user DMs.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── UNLOCK ───────────────────────────────────────────────────────
registry.define({
  name: 'unlock',
  group: 'security',
  usage: '@bot unlock <password>',
  desc: 'Unlock secured commands',
  args: [{ name: 'password', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const secret   = store.getSecurity();
    const input    = String(args.password).trim();
    const pwdOk    = secret.passwordHash && store.verifyPassword(input);
    const totpOk   = secret.totpSecret  && totp.verifyToken(secret.totpSecret, input);

    if (!pwdOk && !totpOk) {
      console.warn(`[SECURITY] Failed unlock attempt by ${ctx.user.tag} (${ctx.user.id})`);
      return { embeds: [ui.error('Incorrect', 'That password or code is not valid.')] };
    }

    store.setLocked(false);
    store.unlockSession(ctx.user.id);
    if (ctx.message) await ctx.message.delete().catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔓 Session Unlocked')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `✅ Verified via **${totpOk ? 'TOTP Code' : 'Password'}**.`,
            '🔒 Secured commands are available for the next **30 minutes**.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── LOCK ─────────────────────────────────────────────────────────
registry.define({
  name: 'lock',
  group: 'security',
  usage: '@bot lock',
  desc: 'Lock all secured commands',
  async run() {
    if (!store.hasPassword() && !store.getSecurity().totpSecret)
      return { embeds: [ui.warn('No Credentials', 'Set a password first with `@bot setpassword <password>`, otherwise you may lock yourself out.')] };

    store.setLocked(true);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.error)
        .setAuthor({ name: '✦ Icy Companion', iconURL: undefined })
        .setTitle('🔒 Bot Locked')
        .setDescription([
          icyDivider(),
          ui.bullet([
            'All secured commands now require `@bot unlock <password>` first.',
            '⚠️ Active sessions have been revoked.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── SETUP-TOTP ───────────────────────────────────────────────────
registry.define({
  name: 'setup-totp',
  aliases: ['setuptotp', 'totp'],
  group: 'security',
  usage: '@bot setup-totp [code]',
  desc: 'Enable 2FA with an authenticator app',
  args: [{ name: 'code', type: 'word', required: false }],
  async run({ ctx, args }) {
    const security = store.getSecurity();

    // Step 2: confirm
    if (args.code) {
      const pending = security.totpPending;
      if (!pending)
        return { embeds: [ui.error('No Pending Setup', 'Run `@bot setup-totp` first to generate a secret.')] };
      if (!totp.verifyToken(pending, args.code))
        return { embeds: [ui.error('Invalid Code', 'That code did not match. Codes rotate every 30s — try the current one.')] };

      store.setTotpSecret(pending);
      store.unlockSession(ctx.user.id);
      if (ctx.message) await ctx.message.delete().catch(() => null);

      return {
        embeds: [new EmbedBuilder()
          .setColor(ICY.success)
          .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
          .setTitle('✅ TOTP Enabled')
          .setDescription([
            icyDivider(ICY.success),
            ui.bullet([
              '✅ Two-factor authentication is now **active**.',
              '🔑 Unlock with `@bot unlock <6-digit code>`.',
              '🔐 Your master password still works as a backup.',
            ]),
            icyDivider(ICY.success),
          ].join('\n'))
          .setFooter({ text: '✦ Icy Companion — 2FA Active' })
          .setTimestamp()
        ]
      };
    }

    // Step 1: generate
    const secret = totp.generateSecret();
    store.setTotpPending(secret);
    const url = totp.buildOtpAuthUrl(secret, { label: ctx.user.tag, issuer: 'Icy Companion' });
    const qr  = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.violet)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🛡️ TOTP Setup')
        .setDescription([
          icyDivider(ICY.violet),
          ui.bullet([
            '**1.** Scan the QR code below with Google Authenticator, Authy or 1Password.',
            '**2.** Or enter this key manually.',
            '**3.** Confirm with `@bot setup-totp <6-digit code>`.',
          ]),
          icyDivider(ICY.violet),
          `**Secret Key:**\n\`\`\`\n${secret}\n\`\`\``,
          icyDivider(ICY.violet),
        ].join('\n'))
        .setImage(qr)
        .setFooter({ text: '⚠️ This secret is not active until you confirm a code.' })
        .setTimestamp()
      ]
    };
  }
});


// ─── ADDSUPEROWNER ────────────────────────────────────────────────
registry.define({
  name: 'addsuperowner',
  aliases: ['add-superowner', 'addsuper', 'add-super-owner'],
  group: 'security',
  usage: '@bot addsuperowner <user id>',
  desc: 'Grant full Super Owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);

    if (store.isSuperOwner(userId)) {
      return { embeds: [ui.warn('Already Super Owner', `<@${userId}> already has full Super Owner access.`)] };
    }

    store.addSuperOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('👑 Super Owner Added', ui.bullet([
        `${user ? `**${user.tag}**` : `<@${userId}>`} now has **full Super Owner** access.`,
        'They can use secured DM commands, manage server owners, and bypass server command restrictions.'
      ]))]
    };
  }
});

// ─── REMOVESUPEROWNER ─────────────────────────────────────────────
registry.define({
  name: 'removesuperowner',
  aliases: ['remove-superowner', 'removesuper', 'remove-super-owner'],
  group: 'security',
  usage: '@bot removesuperowner <user id>',
  desc: 'Revoke additional Super Owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    const primary = store.getSuperOwner();

    if (primary && String(primary) === userId) {
      return { embeds: [ui.error('Cannot Remove Primary', 'The primary Super Owner cannot be removed with this command. Update `SUPER_OWNER_ID` or the stored primary owner instead.')] };
    }

    if (!store.isSuperOwner(userId)) {
      return { embeds: [ui.warn('Not Super Owner', `<@${userId}> is not an additional Super Owner.`)] };
    }

    store.removeSuperOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('👑 Super Owner Removed', `${user ? `**${user.tag}**` : `<@${userId}>`} no longer has additional Super Owner access.`)]
    };
  }
});

// ─── ADDOWNER ──────────────────────────────────────────────────────
registry.define({
  name: 'addowner',
  group: 'security',
  usage: '@bot addowner <user id>',
  desc: 'Grant global owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (store.isSuperOwner(userId))
      return { embeds: [ui.warn('Already Super Owner', 'That user already has the highest access level.')] };
    if (store.isGlobalOwner(userId))
      return { embeds: [ui.warn('Already Owner', `<@${userId}> is already a global owner.`)] };

    store.addOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.amber)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⭐ Owner Added')
        .setDescription([
          icyDivider(ICY.amber),
          `✅ ${user ? `**${user.tag}**` : `<@${userId}>`} now has **global owner** access.`,
          icyDivider(ICY.amber),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── REMOVEOWNER ──────────────────────────────────────────────────
registry.define({
  name: 'removeowner',
  group: 'security',
  usage: '@bot removeowner <user id>',
  desc: 'Revoke global owner access',
  secure: true,
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (store.isSuperOwner(userId))
      return { embeds: [ui.error('Cannot Remove', 'The Super Owner cannot be removed.')] };
    if (!store.isGlobalOwner(userId))
      return { embeds: [ui.warn('Not Owner', `<@${userId}> is not a global owner.`)] };

    store.removeOwner(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.error)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⭐ Owner Removed')
        .setDescription([
          icyDivider(ICY.error),
          `❌ ${user ? `**${user.tag}**` : `<@${userId}>`} no longer has global owner access.`,
          icyDivider(ICY.error),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── ADDJUNIOR ────────────────────────────────────────────────────
registry.define({
  name: 'addjunior',
  group: 'security',
  usage: '@bot addjunior <user id>',
  desc: 'Grant junior owner access (read-only)',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (store.isJuniorOwner(userId))
      return { embeds: [ui.warn('Already Junior', `<@${userId}> is already a junior owner.`)] };

    store.addJunior(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔹 Junior Owner Added')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `${user ? `**${user.tag}**` : `<@${userId}>`} can now use read-only DM commands.`,
            '🔒 Junior owners cannot kick, ban, broadcast or change security settings.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── REMOVEJUNIOR ─────────────────────────────────────────────────
registry.define({
  name: 'removejunior',
  group: 'security',
  usage: '@bot removejunior <user id>',
  desc: 'Revoke junior owner access',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    const userId = String(args.user);
    if (!store.isJuniorOwner(userId))
      return { embeds: [ui.warn('Not Junior', `<@${userId}> is not a junior owner.`)] };

    store.removeJunior(userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.dimGray)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔹 Junior Owner Removed')
        .setDescription([
          icyDivider(),
          `❌ ${user ? `**${user.tag}**` : `<@${userId}>`} no longer has junior access.`,
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

// ─── OWNERLIST ────────────────────────────────────────────────────
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

    const primarySuper = store.getSuperOwner();
    const extraSupers = (Array.isArray(data.superOwners) ? data.superOwners : [])
      .filter(id => String(id) !== String(primarySuper));
    const superLabel = primarySuper ? await label(primarySuper) : '_not set_';
    const extraSuperLabels = extraSupers.length ? await Promise.all(extraSupers.map(id => label(id))) : [];
    const ownerLabels = data.owners.length ? await Promise.all(data.owners.map(id => label(id))) : [];
    const juniorLabels = data.juniorOwners.length ? await Promise.all(data.juniorOwners.map(id => label(id))) : [];

    const lines = [
      `**👑 Primary Super Owner**`,
      `> ${superLabel}`,
      '',
      `**👑 Additional Super Owners (${extraSupers.length})**`,
      ...(extraSuperLabels.length ? extraSuperLabels.map(l => `> ${l}`) : ['> _none_']),
      '',
      `**⭐ Global Owners (${data.owners.length})**`,
      ...(ownerLabels.length ? ownerLabels.map(l => `> ${l}`) : ['> _none_']),
      '',
      `**🔹 Junior Owners (${data.juniorOwners.length})**`,
      ...(juniorLabels.length ? juniorLabels.map(l => `> ${l}`) : ['> _none_']),
    ];

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.amber)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('👑 Owner List')
        .setDescription([ icyDivider(ICY.amber), lines.join('\n'), icyDivider(ICY.amber) ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Security' })
        .setTimestamp()
      ]
    };
  }
});

module.exports = {};
