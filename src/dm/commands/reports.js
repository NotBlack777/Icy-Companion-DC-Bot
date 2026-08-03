/**
 * Report commands: remind, report weekly, report monthly.
 */

const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Build an attendance report over the last `days` days.
 */
function buildReport(guild, days) {
  const config = getServerConfig(guild.id);
  const users = config.attendance?.users || {};
  const streaks = getAllStreaks();
  const prefix = `${guild.id}-`;

  const since = dateKey(daysAgo(days));
  const today = dateKey(new Date());

  const entries = Object.entries(users).map(([userId, day]) => ({
    userId,
    day: String(day).slice(0, 10),
    streak: Number(streaks[`${prefix}${userId}`]?.streak) || 0
  }));

  const active = entries.filter(entry => entry.day >= since);
  const inactive = entries.filter(entry => entry.day < since);
  const markedToday = entries.filter(entry => entry.day === today);

  const topStreaks = [...entries]
    .sort((a, b) => b.streak - a.streak)
    .filter(entry => entry.streak > 0)
    .slice(0, 10);

  return { config, entries, active, inactive, markedToday, topStreaks, since, today };
}

function reportEmbed(guild, days, title) {
  const report = buildReport(guild, days);

  const rate = report.entries.length
    ? Math.round((report.active.length / report.entries.length) * 100)
    : 0;

  const bar = '█'.repeat(Math.round(rate / 10)).padEnd(10, '░');

  const embed = ui.info(`${title} — ${serverLabel(guild)}`)
    .addFields(
      {
        name: '📈 Overview',
        value: ui.codeTable({
          Period: `${report.since} → ${report.today}`,
          Tracked: report.entries.length,
          Active: report.active.length,
          Inactive: report.inactive.length,
          'Marked today': report.markedToday.length,
          Rate: `${bar} ${rate}%`
        })
      }
    );

  if (report.topStreaks.length) {
    const medals = ['🥇', '🥈', '🥉'];

    embed.addFields({
      name: '🔥 Top Streaks',
      value: report.topStreaks
        .map((entry, i) => `${medals[i] || `\`${i + 1}\``} <@${entry.userId}> — **${entry.streak}** days`)
        .join('\n')
    });
  }

  if (report.inactive.length) {
    embed.addFields({
      name: `😴 Inactive (${report.inactive.length})`,
      value: ui.truncate(
        report.inactive.slice(0, 15).map(entry => `> <@${entry.userId}> — last \`${entry.day}\``).join('\n')
      )
    });
  }

  embed.setFooter({ text: `${days}-day report • ${guild.name}` });
  return embed;
}

/* ---------------- REMIND ---------------- */

registry.define({
  name: 'remind',
  group: 'reports',
  usage: '@bot remind <#N/serverid>',
  desc: 'DM the reminder list to mark attendance',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const guild = resolved.guild;
    const config = getServerConfig(guild.id);
    const today = dateKey(new Date());

    const marked = new Set(
      Object.entries(config.attendance?.users || {})
        .filter(([, day]) => String(day).slice(0, 10) === today)
        .map(([userId]) => userId)
    );

    // Explicit reminder list, or everyone tracked who has not marked today.
    const targets = (config.remindUsers?.length
      ? config.remindUsers
      : Object.keys(config.attendance?.users || {})
    ).filter(userId => !marked.has(userId));

    if (!targets.length) {
      return { embeds: [ui.warn('Nobody to remind', `Everyone tracked in **${guild.name}** has already marked attendance today.`)] };
    }

    const embed = ui.info('⏰ Attendance Reminder',
      `You have not marked your attendance in **${guild.name}** today.\n\n> Run \`/attendance\` in the server to keep your streak alive.`
    );

    let sent = 0;
    const failed = [];

    for (const userId of targets) {
      const user = await ctx.client.users.fetch(userId).catch(() => null);

      if (!user || user.bot) {
        failed.push(userId);
        continue;
      }

      try {
        await user.send({ embeds: [embed] });
        sent++;
      } catch {
        failed.push(userId);
      }

      await new Promise(resolve => setTimeout(resolve, 900));
    }

    return {
      embeds: [ui.success('Reminders Sent', ui.bullet([
        `**Server:** ${serverLabel(guild)}`,
        `**Sent:** \`${sent}\``,
        `**Failed:** \`${failed.length}\``,
        `**Already marked:** \`${marked.size}\``
      ]))]
    };
  }
});

/* ---------------- REPORT WEEKLY ---------------- */

registry.define({
  name: 'report weekly',
  aliases: ['weekly', 'report week'],
  group: 'reports',
  usage: '@bot report weekly <#N/serverid>',
  desc: 'Weekly attendance report',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    return { embeds: [reportEmbed(resolved.guild, 7, '📊 Weekly Report')] };
  }
});

/* ---------------- REPORT MONTHLY ---------------- */

registry.define({
  name: 'report monthly',
  aliases: ['monthly', 'report month'],
  group: 'reports',
  usage: '@bot report monthly <#N/serverid>',
  desc: 'Monthly attendance report',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    return { embeds: [reportEmbed(resolved.guild, 30, '📊 Monthly Report')] };
  }
});

module.exports = { buildReport, reportEmbed };
