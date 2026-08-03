/**
 * Privacy commands: turn on/off privacy mode, otjoin mode,
 * force restart, shutdown.
 */

const registry = require('../registry');
const ui = require('../ui');
const store = require('../../utils/globalStore');

/* ---------------- PRIVACY MODE ---------------- */

registry.define({
  name: 'turn on privacy mode',
  aliases: ['privacy on'],
  group: 'privacy',
  usage: '@bot turn on privacy mode',
  desc: 'Hide bot presence and activity',
  async run({ ctx }) {
    store.setPrivacyMode(true);

    try {
      ctx.client.user.setPresence({ status: 'invisible', activities: [] });
    } catch (err) {
      console.warn('[PRIVACY] Could not set presence:', err.message);
    }

    return {
      embeds: [ui.success('Privacy Mode ON', ui.bullet([
        'The bot now appears **offline**.',
        'Activity status is cleared.',
        'Commands keep working normally.'
      ]))]
    };
  }
});

registry.define({
  name: 'turn off privacy mode',
  aliases: ['privacy off'],
  group: 'privacy',
  usage: '@bot turn off privacy mode',
  desc: 'Restore normal bot presence',
  async run({ ctx }) {
    store.setPrivacyMode(false);

    try {
      ctx.client.user.setPresence({
        status: 'online',
        activities: [{ name: '/help', type: 2 }]
      });
    } catch (err) {
      console.warn('[PRIVACY] Could not set presence:', err.message);
    }

    return {
      embeds: [ui.success('Privacy Mode OFF', 'The bot is visible and online again.')]
    };
  }
});

/* ---------------- OTJOIN MODE ---------------- */

registry.define({
  name: 'turn on otjoin mode',
  aliases: ['otjoin on'],
  group: 'privacy',
  usage: '@bot turn on otjoin mode',
  desc: 'Only allow Super Owner-approved server joins',
  async run() {
    store.setOtjoinMode(true);

    return {
      embeds: [ui.success('OTJoin Mode ON', ui.bullet([
        'The bot will **leave any new server** it is added to.',
        'The Super Owner is notified with the invite details.',
        'Existing servers are unaffected.'
      ]))]
    };
  }
});

registry.define({
  name: 'turn off otjoin mode',
  aliases: ['otjoin off'],
  group: 'privacy',
  usage: '@bot turn off otjoin mode',
  desc: 'Allow the bot to join any server',
  async run() {
    store.setOtjoinMode(false);

    return { embeds: [ui.success('OTJoin Mode OFF', 'The bot can be added to any server again.')] };
  }
});

/* ---------------- RESTART ---------------- */

registry.define({
  name: 'force restart',
  aliases: ['restart'],
  group: 'privacy',
  usage: '@bot force restart',
  desc: 'Restart the bot process',
  secure: true,
  async run() {
    store.update(data => {
      data.stats.restarts = (data.stats.restarts || 0) + 1;
    });

    // Give Discord time to deliver the reply before the process dies.
    setTimeout(() => {
      console.log('[RESTART] Requested by Super Owner.');
      process.exit(0);
    }, 2500);

    return {
      embeds: [ui.warn('Restarting', ui.bullet([
        'The bot process is shutting down now.',
        'It will come back automatically if a process manager (pm2, systemd, Docker) is running.',
        'Without one, the bot stays offline until started manually.'
      ]))]
    };
  }
});

/* ---------------- SHUTDOWN ---------------- */

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

      try {
        await ctx.client.destroy();
      } catch {
        // Ignore - we are exiting anyway.
      }

      process.exit(0);
    }, 2500);

    return {
      embeds: [ui.warn('Shutting Down', 'The bot is going offline. A manual start is required to bring it back.')]
    };
  }
});

module.exports = {};
