/**
 * Broadcast commands: broadcast, announce, dm.
 */

const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel, getConfigNumber } = require('../../utils/serverResolver');

const SEND_DELAY_MS = 900;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Best channel to post in when no channel is specified: system channel,
 * else the first text channel the bot can actually send to.
 */
function pickChannel(guild) {
  const me = guild.members.me;

  if (guild.systemChannel?.permissionsFor(me)?.has('SendMessages')) {
    return guild.systemChannel;
  }

  return guild.channels.cache.find(channel =>
    channel.isTextBased?.() &&
    channel.viewable &&
    channel.permissionsFor(me)?.has('SendMessages')
  ) || null;
}

/* ---------------- BROADCAST ---------------- */

registry.define({
  name: 'broadcast',
  aliases: ['bc'],
  group: 'broadcast',
  usage: '@bot broadcast <message>',
  desc: 'Send a message to every server',
  secure: true,
  args: [{ name: 'message', type: 'rest', required: true }],
  async run({ ctx, args }) {
    const guilds = [...ctx.client.guilds.cache.values()];

    const embed = ui.info('📢 Announcement', args.message)
      .setFooter({ text: `From ${ctx.client.user.username}` });

    const sent = [];
    const failed = [];

    for (const guild of guilds) {
      const channel = pickChannel(guild);

      if (!channel) {
        failed.push(`${serverLabel(guild)} — no sendable channel`);
        continue;
      }

      try {
        await channel.send({ embeds: [embed] });
        sent.push(serverLabel(guild));
      } catch (err) {
        failed.push(`${serverLabel(guild)} — ${err.message}`);
      }

      await sleep(SEND_DELAY_MS);
    }

    const result = ui.success('Broadcast Sent', ui.bullet([
      `**Delivered:** \`${sent.length}\``,
      `**Failed:** \`${failed.length}\``,
      `**Total:** \`${guilds.length}\``
    ]));

    if (failed.length) {
      result.addFields({ name: 'Failures', value: ui.truncate(failed.slice(0, 10).join('\n')) });
    }

    return { embeds: [result] };
  }
});

/* ---------------- ANNOUNCE ---------------- */

registry.define({
  name: 'announce',
  group: 'broadcast',
  usage: '@bot announce <#N/serverid> <channel id> <msg>',
  desc: 'Post an announcement in a specific channel',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'channel', type: 'channel', required: true },
    { name: 'message', type: 'rest', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const channel = resolved.guild.channels.cache.get(String(args.channel));

    if (!channel?.isTextBased?.()) {
      return { embeds: [ui.error('Channel not found', `\`${args.channel}\` is not a text channel in **${resolved.guild.name}**.`)] };
    }

    const embed = ui.info('📢 Announcement', args.message)
      .setFooter({ text: `From ${ctx.client.user.username}` });

    let posted;

    try {
      posted = await channel.send({ embeds: [embed] });
    } catch (err) {
      return { embeds: [ui.error('Announce failed', err.message)] };
    }

    return {
      embeds: [ui.success('Announcement Posted', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Channel:** <#${channel.id}>`,
        `**Message ID:** \`${posted.id}\``
      ]))]
    };
  }
});

/* ---------------- DM ---------------- */

registry.define({
  name: 'dm',
  group: 'broadcast',
  usage: '@bot dm <user id> <message>',
  desc: 'Send a direct message to a user',
  secure: true,
  args: [
    { name: 'user', type: 'user', required: true },
    { name: 'message', type: 'rest', required: true }
  ],
  async run({ ctx, args }) {
    let user;

    try {
      user = await ctx.client.users.fetch(args.user);
    } catch {
      return { embeds: [ui.error('User not found', `Could not fetch \`${args.user}\`.`)] };
    }

    if (user.bot) {
      return { embeds: [ui.error('Cannot DM', 'That user is a bot.')] };
    }

    const embed = ui.info('📨 Message', args.message)
      .setFooter({ text: `From ${ctx.client.user.username}` });

    try {
      await user.send({ embeds: [embed] });
    } catch (err) {
      const reason = err.code === 50007
        ? 'Their DMs are closed or the bot is blocked.'
        : err.message;

      return { embeds: [ui.error('Delivery failed', `Could not DM **${user.tag}**.\n> ${reason}`)] };
    }

    return {
      embeds: [ui.success('DM Sent', ui.bullet([
        `**To:** ${user.tag} (\`${user.id}\`)`,
        `**Message:** ${ui.truncate(args.message, 300)}`
      ]))]
    };
  }
});

module.exports = { pickChannel };
