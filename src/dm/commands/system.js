/**
 * System DM commands: health, audit, exportconfig, importconfig.
 */

const { AttachmentBuilder } = require('discord.js');
const registry = require('../registry');
const ui = require('../ui');
const store = require('../../utils/globalStore');
const { getTheme } = require('../../utils/themeManager');
const { listAudit } = require('../../utils/auditLog');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

function formatUptime(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

registry.define({
  name: 'health',
  aliases: ['system', 'diagnostics'],
  group: 'info',
  tier: 'junior',
  usage: '@bot health',
  desc: 'Show bot health and key runtime settings',
  async run({ ctx }) {
    const mem = process.memoryUsage();
    const dmLogger = store.getDmLogger();
    const theme = getTheme();

    return {
      embeds: [ui.panel('System Health', [
        ui.bullet([
          `**Uptime:** \`${formatUptime(ctx.client.uptime)}\``,
          `**WS Ping:** \`${ctx.client.ws.ping}ms\``,
          `**Heap:** \`${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\``,
          `**Guilds:** \`${ctx.client.guilds.cache.size}\``,
          `**Users:** \`${ctx.client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount || 0), 0)}\``,
          `**Theme:** \`${theme.label}\``,
          `**DM Logger:** \`${dmLogger.enabled ? 'on' : 'off'} / ${dmLogger.mode} / ${dmLogger.accessMode}\``,
          `**Audit entries:** \`${listAudit(100).length}\``
        ])
      ], { color: ui.ICY.frost })]
    };
  }
});

registry.define({
  name: 'audit',
  aliases: ['auditlog'],
  group: 'security',
  tier: 'owner',
  secure: true,
  usage: '@bot audit [limit]',
  desc: 'Show recent owner/security command audit entries',
  args: [{ name: 'limit', type: 'int', required: false, default: 10 }],
  async run({ args }) {
    const entries = listAudit(Math.min(Math.max(Number(args.limit) || 10, 1), 25));

    if (!entries.length) return { embeds: [ui.info('Audit Log', 'No audit entries yet.')] };

    return {
      embeds: [ui.panel('Audit Log', entries.map(entry => [
        `**${entry.command || 'unknown'}** — \`${entry.status}\``,
        `> User: ${entry.userId ? `<@${entry.userId}>` : 'unknown'} • Surface: \`${entry.surface || 'unknown'}\``,
        `> Time: <t:${Math.floor(new Date(entry.at).getTime() / 1000)}:R>`
      ].join('\n')), { color: ui.ICY.amber })]
    };
  }
});

registry.define({
  name: 'exportconfig',
  aliases: ['config export', 'backupconfig'],
  group: 'management',
  tier: 'owner',
  secure: true,
  usage: '@bot exportconfig <#N/serverid>',
  desc: 'Export a server config backup as JSON',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const buffer = Buffer.from(JSON.stringify(config, null, 2), 'utf8');
    const file = new AttachmentBuilder(buffer, { name: `icy-config-${resolved.guildId}.json` });

    return {
      embeds: [ui.success('Config Exported', `Backup for **${serverLabel(resolved.guild)}** is attached.`)],
      files: [file]
    };
  }
});

registry.define({
  name: 'importconfig',
  aliases: ['config import', 'restoreconfig'],
  group: 'management',
  tier: 'owner',
  secure: true,
  usage: '@bot importconfig <#N/serverid> <json or attach .json>',
  desc: 'Import a server config backup from JSON',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'json', type: 'rest', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    let raw = String(args.json || '').trim();
    const attachment = ctx.message?.attachments?.first?.();

    if (!raw && attachment?.url) {
      const response = await fetch(attachment.url).catch(() => null);
      if (response?.ok) raw = await response.text();
    }

    if (!raw) return { embeds: [ui.error('Missing JSON', 'Paste JSON after the command or attach the exported `.json` file.')] };

    let imported;
    try {
      imported = JSON.parse(raw);
    } catch (err) {
      return { embeds: [ui.error('Invalid JSON', err.message)] };
    }

    imported.guildId = resolved.guildId;
    imported.guildName = resolved.guild.name;
    const saved = saveServerConfig(resolved.guildId, imported);

    return {
      embeds: [ui.success('Config Imported', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Owners:** \`${saved.extraOwners?.length || 0}\` extra`,
        `**Staff roles:** \`${saved.staffRoles?.length || 0}\``,
        'The config was normalized before saving.'
      ]))]
    };
  }
});

module.exports = {};
