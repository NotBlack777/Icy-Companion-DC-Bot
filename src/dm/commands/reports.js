/**
 * Report commands: remind, report weekly, report monthly.
 * Icy futuristic UI.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const { ICY } = ui;

function icyDivider(color = ICY.frost) { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

function dateKey(d) { return d.toISOString().slice(0,10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

function buildReport(guild, days) {
  const config  = getServerConfig(guild.id);
  const users   = config.attendance?.users || {};
  const streaks = getAllStreaks();
  const prefix  = `${guild.id}-`;

  const since = dateKey(daysAgo(days));
  const today = dateKey(new Date());

  const entries = Object.entries(users).map(([userId, day]) => ({
    userId, day: String(day).slice(0,10),
    streak: Number(streaks[`${prefix}${userId}`]?.streak) || 0
  }));

  return {
    active:       entries.filter(e => e.day >= since),
    inactive:     entries.filter(e => e.day < since),
    markedToday:  entries.filter(e => e.day === today),
    topStreaks:   [...entries].sort((a,b) => b.streak - a.streak).filter(e => e.streak > 0).slice(0,10),
    since, today,
    total: entries.length,
  };
}

function reportEmbed(guild, days, title) {
  const r = buildReport(guild, days);
  const rate = r.total ? Math.round((r.active.length / r.total) * 100) : 0;
  const bar  = ui.progressBar(rate, 100, 12);

  const embed = new EmbedBuilder()
    .setColor(ICY.amber)
    .setAuthor({ name: '✦ Icy Companion', iconURL: undefined })
    .setTitle(`📊 ${title} — ${serverLabel(guild)}`)
    .setDescription([
      icyDivider(ICY.amber),
      `**Period:** \`${r.since}\` → \`${r.today}\` (\`${days}\` days)`,
      '',
      `\`\`\n  📈 Overview\n  ${'─'.repeat(30)}\n  Tracked     │ ${r.total}\n  Active      │ ${r.active.length}\n  Inactive    │ ${r.inactive.length}\n  Marked Today│ ${r.markedToday.length}\n  ─────────────────────────────\n  Rate        │ ${bar} ${rate}%\n\`\`\``,
      '',
      r.topStreaks.length
        ? `**🔥 Top Streaks**\n${r.topStreaks.map((e,i) => `${['🥇','🥈','🥉'][i]||`·`} <@${e.userId}> — **${e.streak}** days`).join('\n')}`
        : '',
      r.inactive.length
        ? `\n**😴 Inactive (${r.inactive.length})**\n${ui.truncate(r.inactive.slice(0,15).map(e => `> <@${e.userId}> — last \`${e.day}\``).join('\n'), 800)}`
        : '',
      icyDivider(ICY.amber),
    ].filter(Boolean).join('\n'))
    .setFooter({ text: `✦ ${days}-day report • ${guild.name}` })
    .setTimestamp();

  return embed;
}

/* ─── REMIND ────────────────────────────────────────────────────── */
registry.define({
  name: 'remind',
  group: 'reports',
  usage: '@bot remind <#N/serverid>',
  desc: 'DM the reminder list to mark attendance',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const guild  = resolved.guild;
    const config = getServerConfig(guild.id);
    const today  = dateKey(new Date());
    const marked = new Set(Object.entries(config.attendance?.users || {}).filter(([,d]) => String(d).slice(0,10) === today).map(([id]) => id));
    const targets = ((config.remindUsers?.length ? config.remindUsers : Object.keys(config.attendance?.users || {}))).filter(id => !marked.has(id));

    if (!targets.length)
      return { embeds: [ui.warn('Nobody to Remind', `Everyone tracked in **${guild.name}** has already marked attendance today.`)] };

    const reminderEmbed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('⏰ Attendance Reminder')
      .setDescription(`You haven't marked your attendance in **${guild.name}** today.\n\n> Run \`/attendance\` in the server to keep your streak alive.`)
      .setFooter({ text: '✦ Icy Companion' })
      .setTimestamp();

    let sent = 0, failed = [];
    for (const userId of targets) {
      const user = await ctx.client.users.fetch(userId).catch(() => null);
      if (!user || user.bot) { failed.push(userId); continue; }
      try { await user.send({ embeds: [reminderEmbed] }); sent++; } catch { failed.push(userId); }
      await new Promise(r => setTimeout(r, 900));
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Reminders Sent')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(guild)}`,
            `**Sent:** \`${sent}\``,
            `**Failed:** \`${failed.length}\``,
            `**Already marked:** \`${marked.size}\``,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Reminders' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── REPORT WEEKLY ──────────────────────────────────────────────── */
registry.define({
  name: 'report weekly',
  aliases: ['weekly', 'report week'],
  group: 'reports',
  usage: '@bot report weekly <#N/serverid>',
  desc: 'Weekly attendance report',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };
    return { embeds: [reportEmbed(resolved.guild, 7, 'Weekly Report')] };
  }
});

/* ─── REPORT MONTHLY ────────────────────────────────────────────── */
registry.define({
  name: 'report monthly',
  aliases: ['monthly', 'report month'],
  group: 'reports',
  usage: '@bot report monthly <#N/serverid>',
  desc: 'Monthly attendance report',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };
    return { embeds: [reportEmbed(resolved.guild, 30, 'Monthly Report')] };
  }
});

module.exports = { buildReport, reportEmbed };
