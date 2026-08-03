/**
 * messageCreate handler
 * ---------------------
 * Three jobs, in priority order:
 *
 *   1. `@bot <command>` from an owner  -> run the DM command.
 *   2. A staff reply inside a relay channel -> forward to the user.
 *   3. A DM from a normal user -> relay to the Super Owner (modmail).
 */

const { Events } = require('discord.js');

const dm = require('../dm');
const ui = require('../dm/ui');
const store = require('../utils/globalStore');

/**
 * Owners get a typing indicator, so long commands feel responsive.
 */
async function withTyping(channel, task) {
  const typing = channel?.sendTyping?.().catch(() => null);
  await typing;
  return task();
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {
      if (message.author.bot) return;

      const botId = client.user.id;

      /* ---------- 1. @bot commands ---------- */

      const parsed = dm.parser.parse(message.content, botId, dm.registry);

      if (parsed.addressed) {
        // Bare mention -> show help to owners, ignore everyone else.
        if (parsed.empty) {
          if (!store.hasTier(message.author.id, 'junior')) return;

          const payload = dm.help.buildDmHelp({
            client,
            user: message.author,
            channel: message.channel,
            message,
            source: 'mention'
          });

          return message.reply(payload).catch(() => null);
        }

        if (!parsed.command) {
          if (!store.hasTier(message.author.id, 'junior')) return;

          return message.reply({
            embeds: [ui.error('Unknown command', `\`${parsed.unknown}\` is not a command.\n> Run \`@bot help\` to see everything.`)]
          }).catch(() => null);
        }

        const ctx = {
          client,
          user: message.author,
          channel: message.channel,
          guild: message.guild,
          message,
          source: 'mention'
        };

        const payload = await withTyping(message.channel, () =>
          dm.executor.execute(parsed.command, ctx, parsed.args, parsed.errors)
        );

        if (!payload) return;

        return message.reply(payload).catch(async () => {
          // reply() fails if the original message was deleted (e.g. setpassword).
          await message.channel.send(payload).catch(() => null);
        });
      }

      /* ---------- 2. Relay channel replies ---------- */

      if (message.guild) {
        await dm.logger.handleRelayReply(client, message);
        return;
      }

      /* ---------- 3. Inbound modmail ---------- */

      await dm.logger.handleIncomingDm(client, message);
    } catch (err) {
      console.error('[MESSAGE ERROR]', err);
    }
  }
};
