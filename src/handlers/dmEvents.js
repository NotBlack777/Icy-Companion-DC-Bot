/**
 * DM event handlers
 * -----------------
 * Registers the non-message DM events the logger needs: reactions
 * (added/removed), edits and deletes.
 *
 * All of these arrive as partials for uncached DMs, so each handler
 * resolves the partial before doing anything.
 */

const { Events, ChannelType } = require('discord.js');
const logger = require('../dm/logger');

/**
 * True when an event happened inside a DM channel with the bot.
 */
function isDmChannel(channel) {
  return channel?.type === ChannelType.DM || channel?.isDMBased?.() === true;
}

/**
 * Resolve a partial structure, returning null if it cannot be fetched.
 */
async function resolvePartial(structure) {
  if (!structure?.partial) return structure;

  try {
    return await structure.fetch();
  } catch {
    return null;
  }
}

function register(client) {
  /* ---------------- REACTION ADDED ---------------- */

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      if (user.bot) return;

      const resolved = await resolvePartial(reaction);
      if (!resolved) return;

      if (!isDmChannel(resolved.message?.channel)) return;

      await logger.handleDmReaction(client, resolved, user, false);
    } catch (err) {
      console.error('[DM REACTION ADD]', err);
    }
  });

  /* ---------------- REACTION REMOVED ---------------- */

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
      if (user.bot) return;

      const resolved = await resolvePartial(reaction);
      if (!resolved) return;

      if (!isDmChannel(resolved.message?.channel)) return;

      await logger.handleDmReaction(client, resolved, user, true);
    } catch (err) {
      console.error('[DM REACTION REMOVE]', err);
    }
  });

  /* ---------------- MESSAGE EDITED ---------------- */

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    try {
      const resolved = await resolvePartial(newMessage);
      if (!resolved) return;

      if (!isDmChannel(resolved.channel)) return;
      if (resolved.author?.bot) return;

      await logger.handleDmEdit(client, oldMessage, resolved);
    } catch (err) {
      console.error('[DM EDIT]', err);
    }
  });

  /* ---------------- MESSAGE DELETED ---------------- */

  client.on(Events.MessageDelete, async (message) => {
    try {
      // Deleted messages can never be fetched - only cached ones are usable.
      if (message.partial) return;

      if (!isDmChannel(message.channel)) return;
      if (message.author?.bot) return;

      await logger.handleDmDelete(client, message);
    } catch (err) {
      console.error('[DM DELETE]', err);
    }
  });
}

module.exports = { register, isDmChannel };
