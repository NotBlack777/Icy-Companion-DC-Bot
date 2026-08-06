/**
 * Broadcast commands: broadcast, announce, dm.
 * Icy futuristic UI.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');

const SEND_DELAY_MS = 900;
const { ICY } = ui;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pickChannel(guild) {
  const me = guild.members.me;
  if (guild.systemChannel?.permissionsFor(me)?.has('SendMessages')) return guild.systemChannel;
  return guild.channels.cache.find(c => c.isTextBased?.() && c.viewable && c.permissionsFor(me)?.has('SendMessages')) || null;
}

function icyDivider() { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

function announcementEmbed(ctx, message) {
  return new EmbedBuilder()
    .setColor(ICY.neon)
    .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
    .setTitle('📢 Announcement')
    .setDescription(message)
    .setFooter({ text: '✦ Icy Companion — Broadcast' })
    .setTimestamp();
}

/* ─── BROADCAST ─────────────────────────────────────────────────── */
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

    const embed = new EmbedBuilder()
      .setColor(ICY.success)
      .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('✅ Broadcast Sent')
      .setDescription([
        icyDivider(),
        ui.bullet([
          `**✅ Delivered:** \`${sent.length}\` server${sent.length!==1?'s':''}`,
          `**❌ Failed:** \`${failed.length}\``,
          `**📊 Total:** \`${guilds.length}\``,
        ]),
        failed.length ? `\n**Failures:**\n${ui.truncate(failed.slice(0,10).join('\n'), 1000)}` : '',
        icyDivider(),
      ].join('\n'))
      .setFooter({ text: `✦ ${sent.length}/${guilds.length} delivered` })
      .setTimestamp();

    return { embeds: [embed] };
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
    if (!channel?.isTextBased?.())
      return { embeds: [ui.error('Channel Not Found', `\`${args.channel}\` is not a text channel in **${resolved.guild.name}**.`)] };

    let posted;
    try { posted = await channel.send({ embeds: [announcementEmbed(ctx, args.message)] }); }
    catch (err) { return { embeds: [ui.error('Announce Failed', err.message)] }; }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.neon)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Announcement Posted')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**Channel:** <#${channel.id}>`,
            `**Message ID:** \`${posted.id}\``,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Broadcast' })
        .setTimestamp()
      ]
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
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ DM Sent')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**To:** ${user.tag} (\`${user.id}\`)`,
            `**Message:** ${ui.truncate(args.message, 300)}`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Direct Message' })
        .setTimestamp()
      ]
    };
  }
});

module.exports = { pickChannel };
