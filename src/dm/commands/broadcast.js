/**
 * Broadcast commands: broadcast, announce, dm, massdm.
 * Sunset Ice UI with safe progress updates for long-running sends.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { hexToInt } = require('../../utils/themeManager');

const SEND_DELAY_MS = Number(process.env.BROADCAST_SEND_DELAY_MS || 900);
const MASS_DM_DEFAULT_DELAY_MS = Number(process.env.MASS_DM_DEFAULT_DELAY_MS || 1200);
const MASS_DM_MIN_DELAY_MS = Number(process.env.MASS_DM_MIN_DELAY_MS || 750);
const MASS_DM_MAX_DELAY_MS = Number(process.env.MASS_DM_MAX_DELAY_MS || 10000);
const MASS_DM_PROGRESS_EVERY = Number(process.env.MASS_DM_PROGRESS_EVERY || 10);
const { ICY } = ui;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pickChannel(guild) {
  const me = guild.members.me;
  if (guild.systemChannel?.permissionsFor(me)?.has('SendMessages')) return guild.systemChannel;
  return guild.channels.cache.find(c => c.isTextBased?.() && c.viewable && c.permissionsFor(me)?.has('SendMessages')) || null;
}

function clamp(number, min, max) {
  return Math.min(Math.max(Number(number) || min, min), max);
}

function announcementEmbed(ctx, message, options = {}) {
  const {
    title = '📢 Announcement',
    color = ICY.orange
  } = options;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: '🌅 Icy Companion • Broadcast Matrix',
      iconURL: ctx.client.user?.displayAvatarURL?.() || undefined
    })
    .setTitle(title)
    .setDescription(ui.truncate(message, 3900))
    .setFooter({ text: 'Icy Companion • Sunset Ice Broadcast' })
    .setTimestamp();
}

function resultEmbed(ctx, title, lines, color = ICY.success) {
  return ui.panel(title, lines, {
    color,
    author: {
      name: '🌅 Icy Companion • Broadcast Matrix',
      iconURL: ctx.client.user?.displayAvatarURL?.() || undefined
    },
    footer: 'Broadcast Matrix • Secure Owner Tool'
  });
}

function parseMassDmOptions(raw) {
  let text = String(raw || '').trim();
  const options = {
    mode: 'embed',
    title: '📢 Announcement',
    color: ICY.orange,
    delayMs: MASS_DM_DEFAULT_DELAY_MS,
    includeBots: false,
    dryRun: false,
    confirmed: false,
    limit: null
  };

  function strip(regex, handler) {
    text = text.replace(regex, (...match) => {
      handler(...match);
      return ' ';
    }).replace(/\s+/g, ' ').trim();
  }

  strip(/--plain\b/gi, () => { options.mode = 'plain'; });
  strip(/--embed\b/gi, () => { options.mode = 'embed'; });
  strip(/--include-bots\b/gi, () => { options.includeBots = true; });
  strip(/--dry-run\b/gi, () => { options.dryRun = true; });
  strip(/--yes\b|--confirm\b/gi, () => { options.confirmed = true; });
  strip(/--delay(?:=|\s+)(\d{2,5})\b/gi, (_all, value) => {
    options.delayMs = clamp(value, MASS_DM_MIN_DELAY_MS, MASS_DM_MAX_DELAY_MS);
  });
  strip(/--limit(?:=|\s+)(\d{1,6})\b/gi, (_all, value) => {
    options.limit = Math.max(1, Number(value));
  });
  strip(/--color(?:=|\s+)(#?[0-9a-fA-F]{6})\b/gi, (_all, value) => {
    options.color = hexToInt(value, 'color');
  });
  strip(/--title(?:=|\s+)("([^"]{1,100})"|'([^']{1,100})'|([^\-][^\s]{0,100}))/gi, (_all, _raw, doubleQuoted, singleQuoted, bare) => {
    options.title = (doubleQuoted || singleQuoted || bare || options.title).trim();
  });

  return { options, message: text };
}

function memberRecipients(guild, includeBots) {
  return [...guild.members.cache.values()]
    .filter(member => member?.user && member.id !== guild.client.user.id)
    .filter(member => includeBots || !member.user.bot);
}

function massDmProgressEmbed(ctx, state) {
  const done = state.sent + state.failed + state.skipped;
  const percent = state.total ? Math.round((done / state.total) * 100) : 0;

  return resultEmbed(ctx, state.dryRun ? 'Mass DM Dry Run' : 'Mass DM In Progress', [
    ui.bullet([
      `**Server:** ${state.server}`,
      `**Progress:** \`${done}/${state.total}\` (${percent}%)`,
      `**Sent:** \`${state.sent}\``,
      `**Failed:** \`${state.failed}\``,
      `**Skipped:** \`${state.skipped}\``,
      `**Mode:** \`${state.mode}\``,
      `**Delay:** \`${state.delayMs}ms\``
    ]),
    '',
    ui.progressBar(done, Math.max(state.total, 1), 18)
  ], state.dryRun ? ICY.warn : ICY.frost);
}

async function updateMassDmProgress(ctx, state, force = false) {
  if (!force && state.processed % MASS_DM_PROGRESS_EVERY !== 0) return;

  const payload = { embeds: [massDmProgressEmbed(ctx, state)] };

  if (ctx.progressMessage?.edit) {
    await ctx.progressMessage.edit(payload).catch(() => null);
    return;
  }

  if (ctx.interaction?.editReply) {
    await ctx.interaction.editReply(payload).catch(() => null);
  }
}

async function fetchMembers(guild) {
  try {
    return await guild.members.fetch();
  } catch (err) {
    throw new Error(`Could not fetch members. Make sure the bot has the Server Members Intent enabled. (${err.message})`);
  }
}

/* ─── BROADCAST ─────────────────────────────────────────────────── */
registry.define({
  name: 'broadcast',
  aliases: ['bc'],
  group: 'broadcast',
  usage: '@bot broadcast <message>',
  desc: 'Send a message to every server',
  secure: true,
  deferMessage: true,
  args: [{ name: 'message', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const guilds = [...ctx.client.guilds.cache.values()];
    const sent = [], failed = [];

    for (const guild of guilds) {
      const channel = pickChannel(guild);
      if (!channel) { failed.push(`${serverLabel(guild)} — no sendable channel`); continue; }
      try {
        await channel.send({ embeds: [announcementEmbed(ctx, args.message)] });
        sent.push(serverLabel(guild));
      } catch (err) { failed.push(`${serverLabel(guild)} — ${err.message}`); }
      await sleep(SEND_DELAY_MS);
    }

    return {
      embeds: [resultEmbed(ctx, 'Broadcast Sent', [
        ui.bullet([
          `**Delivered:** \`${sent.length}\` server${sent.length !== 1 ? 's' : ''}`,
          `**Failed:** \`${failed.length}\``,
          `**Total:** \`${guilds.length}\``
        ]),
        failed.length ? `\n**Failures:**\n${ui.truncate(failed.slice(0, 10).join('\n'), 1000)}` : ''
      ])]
    };
  }
});

/* ─── ANNOUNCE ─────────────────────────────────────────────────── */
registry.define({
  name: 'announce',
  group: 'broadcast',
  usage: '@bot announce <#N/serverid> <channel id> <msg>',
  desc: 'Post an announcement in a specific channel',
  secure: true,
  args: [
    { name: 'server',  type: 'server',  required: true },
    { name: 'channel', type: 'channel', required: true },
    { name: 'message', type: 'rest',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const channel = resolved.guild.channels.cache.get(String(args.channel));
    if (!channel?.isTextBased?.()) {
      return { embeds: [ui.error('Channel Not Found', `\`${args.channel}\` is not a text channel in **${resolved.guild.name}**.`)] };
    }

    let posted;
    try { posted = await channel.send({ embeds: [announcementEmbed(ctx, args.message)] }); }
    catch (err) { return { embeds: [ui.error('Announce Failed', err.message)] }; }

    return {
      embeds: [resultEmbed(ctx, 'Announcement Posted', [
        ui.bullet([
          `**Server:** ${serverLabel(resolved.guild)}`,
          `**Channel:** <#${channel.id}>`,
          `**Message ID:** \`${posted.id}\``
        ])
      ], ICY.orange)]
    };
  }
});

/* ─── MASS DM ───────────────────────────────────────────────────── */
registry.define({
  name: 'massdm',
  aliases: ['mass dm', 'dm all', 'dmall', 'mass-dm'],
  group: 'broadcast',
  usage: '@bot massdm <#N/serverid> [--plain|--embed] [--title "title"] [--color #hex] [--delay ms] [--limit n] [--dry-run] <message>',
  desc: 'Mass DM every member in a server with progress tracking',
  secure: true,
  deferMessage: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'message', type: 'rest', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    let parsed;
    try {
      parsed = parseMassDmOptions(args.message);
    } catch (err) {
      return { embeds: [ui.error('Invalid Mass DM Options', err.message)] };
    }

    const { options, message } = parsed;
    if (!message) {
      return { embeds: [ui.error('Missing Message', 'Add a message after the options. Example: `@bot massdm #1 --embed Hello staff!`')] };
    }

    try {
      await fetchMembers(resolved.guild);
    } catch (err) {
      return { embeds: [ui.error('Member Fetch Failed', err.message)] };
    }

    let recipients = memberRecipients(resolved.guild, options.includeBots);
    const skippedBots = options.includeBots ? 0 : [...resolved.guild.members.cache.values()].filter(member => member.user?.bot).length;

    if (options.limit) recipients = recipients.slice(0, options.limit);

    const state = {
      server: serverLabel(resolved.guild),
      total: recipients.length,
      sent: 0,
      failed: 0,
      skipped: skippedBots,
      processed: 0,
      mode: options.mode,
      delayMs: options.delayMs,
      dryRun: options.dryRun
    };

    await updateMassDmProgress(ctx, state, true);

    if (!recipients.length) {
      return { embeds: [ui.warn('No Recipients', 'No members matched the mass DM filters.')] };
    }

    if (!options.dryRun && !options.confirmed) {
      return {
        embeds: [resultEmbed(ctx, 'Mass DM Confirmation Required', [
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**Recipients:** \`${recipients.length}\``,
            `**Mode:** \`${options.mode}\``,
            `**Delay:** \`${options.delayMs}ms\``,
            '**Safety:** run a dry-run first, then add `--yes` to send.'
          ]),
          '',
          `**Dry run:** \`@bot massdm ${args.server} --dry-run --limit 10 ${ui.truncate(message, 80)}\``,
          `**Send:** \`@bot massdm ${args.server} --yes ${options.mode === 'plain' ? '--plain ' : ''}${ui.truncate(message, 80)}\``
        ], ICY.warn)]
      };
    }

    const failures = [];

    for (const member of recipients) {
      state.processed++;

      if (options.dryRun) {
        state.sent++;
        await updateMassDmProgress(ctx, state);
        continue;
      }

      try {
        if (options.mode === 'plain') {
          await member.send({ content: ui.truncate(message, 1900) });
        } else {
          await member.send({ embeds: [announcementEmbed(ctx, message, { title: options.title, color: options.color })] });
        }

        state.sent++;
      } catch (err) {
        state.failed++;
        if (failures.length < 12) {
          failures.push(`${member.user.tag || member.id} — ${err.code === 50007 ? 'DMs closed/blocked' : err.message}`);
        }
      }

      await updateMassDmProgress(ctx, state);
      await sleep(options.delayMs);
    }

    return {
      embeds: [resultEmbed(ctx, options.dryRun ? 'Mass DM Dry Run Complete' : 'Mass DM Complete', [
        ui.bullet([
          `**Server:** ${serverLabel(resolved.guild)}`,
          `**Recipients:** \`${recipients.length}\``,
          `**Sent:** \`${state.sent}\``,
          `**Failed:** \`${state.failed}\``,
          `**Skipped bots:** \`${skippedBots}\``,
          `**Mode:** \`${options.mode}\``,
          `**Delay:** \`${options.delayMs}ms\``
        ]),
        failures.length ? `\n**Sample failures:**\n${ui.truncate(failures.map(f => `> ${f}`).join('\n'), 1000)}` : '',
        '',
        ui.progressBar(state.sent + state.failed, Math.max(state.total, 1), 18)
      ], options.dryRun ? ICY.warn : ICY.success)]
    };
  }
});

/* ─── DM ────────────────────────────────────────────────────────── */
registry.define({
  name: 'dm',
  group: 'broadcast',
  usage: '@bot dm <user id> <message>',
  desc: 'Send a direct message to a user',
  secure: true,
  args: [
    { name: 'user',   type: 'user', required: true },
    { name: 'message', type: 'rest', required: true }
  ],
  async run({ ctx, args }) {
    let user;
    try { user = await ctx.client.users.fetch(args.user); }
    catch { return { embeds: [ui.error('User Not Found', `Could not fetch \`${args.user}\`.`)] }; }

    if (user.bot) return { embeds: [ui.error('Cannot DM', 'That user is a bot.')] };

    try {
      // This is an owner-to-user direct message, not an announcement.
      // Send the text plainly so `@bot dm <user> hello` arrives as `hello`,
      // instead of looking like a broadcast embed.
      await user.send({ content: ui.truncate(args.message, 1900) });
    } catch (err) {
      const reason = err.code === 50007 ? 'Their DMs are closed or the bot is blocked.' : err.message;
      return { embeds: [ui.error('Delivery Failed', `Could not DM **${user.tag}**.\n> ${reason}`)] };
    }

    return {
      embeds: [resultEmbed(ctx, 'DM Sent', [
        ui.bullet([
          `**To:** ${user.tag} (\`${user.id}\`)`,
          `**Message:** ${ui.truncate(args.message, 300)}`
        ])
      ], ICY.success)]
    };
  }
});

module.exports = { pickChannel, parseMassDmOptions, massDmProgressEmbed };
