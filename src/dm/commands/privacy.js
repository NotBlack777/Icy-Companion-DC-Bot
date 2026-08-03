/**
 * Privacy commands: turn on/off privacy mode, otjoin mode,
 * force restart, shutdown.
 * Icy futuristic UI.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const store     = require('../../utils/globalStore');

const { ICY } = ui;

function icyDivider(color = ICY.frost) { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

function icyEmbed(title, description, color = ICY.frost) {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '✦ Icy Companion', iconURL: undefined })
    .setTitle(title)
    .setDescription([ icyDivider(color), description, icyDivider(color) ].join('\n'))
    .setFooter({ text: '✦ Icy Companion — Privacy' })
    .setTimestamp();
}

/* ─── PRIVACY MODE ON ────────────────────────────────────────────── */
registry.define({
  name: 'turn on privacy mode',
  aliases: ['privacy on'],
  group: 'privacy',
  usage: '@bot turn on privacy mode',
  desc: 'Hide bot presence and activity',
  async run({ ctx }) {
    store.setPrivacyMode(true);
    try { ctx.client.user.setPresence({ status: 'invisible', activities: [] }); } catch {}
    return {
      embeds: [icyEmbed('🔒 Privacy Mode ON', ui.bullet([
        'The bot now appears **offline**.',
        'Activity status is cleared.',
        'Commands keep working normally.',
      ]), ICY.glacier)]
    };
  }
});

/* ─── PRIVACY MODE OFF ───────────────────────────────────────────── */
registry.define({
  name: 'turn off privacy mode',
  aliases: ['privacy off'],
  group: 'privacy',
  usage: '@bot turn off privacy mode',
  desc: 'Restore normal bot presence',
  async run({ ctx }) {
    store.setPrivacyMode(false);
    try { ctx.client.user.setPresence({ status: 'online', activities: [{ name: '/help', type: 2 }] }); } catch {}
    return {
      embeds: [icyEmbed('🔓 Privacy Mode OFF', ui.bullet([
        'The bot is **visible and online** again.',
        'Activity status has been restored.',
      ]), ICY.frost)]
    };
  }
});

/* ─── OTJOIN ON ──────────────────────────────────────────────────── */
registry.define({
  name: 'turn on otjoin mode',
  aliases: ['otjoin on'],
  group: 'privacy',
  usage: '@bot turn on otjoin mode',
  desc: 'Only allow Super Owner-approved server joins',
  async run() {
    store.setOtjoinMode(true);
    return {
      embeds: [icyEmbed('⚠️ OTJoin Mode ON', ui.bullet([
        'The bot will **leave any new server** it is added to.',
        'The Super Owner is notified with invite details.',
        'Existing servers are unaffected.',
      ]), ICY.warn)]
    };
  }
});

/* ─── OTJOIN OFF ─────────────────────────────────────────────────── */
registry.define({
  name: 'turn off otjoin mode',
  aliases: ['otjoin off'],
  group: 'privacy',
  usage: '@bot turn off otjoin mode',
  desc: 'Allow the bot to join any server',
  async run() {
    store.setOtjoinMode(false);
    return {
      embeds: [icyEmbed('✅ OTJoin Mode OFF', 'The bot can be added to any server again.', ICY.success)]
    };
  }
});

/* ─── FORCE RESTART ──────────────────────────────────────────────── */
registry.define({
  name: 'force restart',
  aliases: ['restart'],
  group: 'privacy',
  usage: '@bot force restart',
  desc: 'Restart the bot process',
  secure: true,
  async run() {
    store.update(data => { data.stats.restarts = (data.stats.restarts || 0) + 1; });
    setTimeout(() => { console.log('[RESTART] Requested by Super Owner.'); process.exit(0); }, 2500);
    return {
      embeds: [icyEmbed('🔄 Restarting...', ui.bullet([
        'The bot process is shutting down now.',
        'It will come back automatically if a process manager (pm2, systemd, Docker) is running.',
        'Without one, the bot stays offline until started manually.',
      ]), ICY.warn)]
    };
  }
});

/* ─── SHUTDOWN ───────────────────────────────────────────────────── */
registry.define({
  name: 'shutdown',
  aliases: ['stop'],
  group: 'privacy',
  usage: '@bot shutdown',
  desc: 'Shut the bot down completely',
  secure: true,
  async run({ ctx }) {
    setTimeout(async () => {
      console.log('[SHUTDOWN] Requested by Super Owner.');
      try { await ctx.client.destroy(); } catch {}
      process.exit(0);
    }, 2500);
    return {
      embeds: [icyEmbed('⛔ Shutting Down', ui.bullet([
        'The bot is going **offline**.',
        'A manual start is required to bring it back.',
      ]), ICY.error)]
    };
  }
});

module.exports = {};
