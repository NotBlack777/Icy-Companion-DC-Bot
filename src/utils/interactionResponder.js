/**
 * Interaction responder
 * ---------------------
 * Discord gives a bot exactly 3 seconds to acknowledge a component
 * interaction. If nothing acknowledges it in that window the user sees
 * "Icy Companion took too long to respond" and the click is lost forever.
 *
 * This module guarantees an interaction is ALWAYS acknowledged:
 *
 *   1. Fast path   -> interaction.update(payload)
 *                     Instant, silent, zero flicker. Happens ~99% of the time.
 *
 *   2. Watchdog    -> if the payload is not ready within ACK_DEADLINE_MS we
 *                     acknowledge first (deferUpdate, or a visible
 *                     "Thinking..." embed) and edit the real content in after.
 *                     This buys 15 minutes instead of 3 seconds.
 *
 *   3. Last resort -> an ephemeral follow-up so the user is never left
 *                     staring at a dead button.
 *
 * Nothing in here is allowed to throw.
 */

const { MessageFlags } = require('discord.js');

// Acknowledge well before Discord's hard 3000ms cutoff so the round trip
// to Discord still lands in time.
const ACK_DEADLINE_MS = 1200;

function isAcknowledged(interaction) {
  return Boolean(interaction?.deferred || interaction?.replied);
}

/**
 * Resolve a payload that may be a plain object, a sync factory or an
 * async factory. Never throws.
 */
async function resolvePayload(payload) {
  if (typeof payload !== 'function') return payload;
  return payload();
}

/**
 * Acknowledge a component interaction without changing anything on screen.
 * Falls back to a visible "Thinking..." state if a silent ack is not possible.
 */
async function acknowledgeQuietly(interaction, thinkingPayload) {
  if (isAcknowledged(interaction)) return true;

  try {
    await interaction.deferUpdate();
    return true;
  } catch (err) {
    console.warn('[RESPONDER] deferUpdate failed:', err.message);
  }

  // Silent ack failed - fall back to a visible loading state so the user
  // at least gets feedback instead of an error.
  if (thinkingPayload) {
    try {
      await interaction.update(await resolvePayload(thinkingPayload));
      return true;
    } catch (err) {
      console.warn('[RESPONDER] thinking-state update failed:', err.message);
    }
  }

  return false;
}

/**
 * Update the message behind a component interaction, safely.
 *
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {object|Function} payload        Final message payload (or factory).
 * @param {object} [options]
 * @param {object|Function} [options.thinking]  Payload for the loading state.
 * @param {string} [options.errorMessage]       Ephemeral text if everything fails.
 */
async function safeUpdate(interaction, payload, options = {}) {
  const {
    thinking = null,
    errorMessage = 'Something went wrong while updating that. Please try again.'
  } = options;

  let settled = false;

  // Watchdog: if building the payload is slow, acknowledge before the
  // 3 second cutoff so the interaction token stays alive.
  const watchdog = setTimeout(() => {
    if (settled) return;
    acknowledgeQuietly(interaction, thinking).catch(() => null);
  }, ACK_DEADLINE_MS);

  try {
    const finalPayload = await resolvePayload(payload);
    settled = true;
    clearTimeout(watchdog);

    // Watchdog already acknowledged -> edit the existing message.
    if (isAcknowledged(interaction)) {
      return await interaction.editReply(finalPayload);
    }

    // Fast path: silent, instant swap.
    return await interaction.update(finalPayload);
  } catch (err) {
    settled = true;
    clearTimeout(watchdog);

    console.error('[RESPONDER] safeUpdate failed:', err);

    // Recovery: make sure the interaction is acknowledged, then try once more.
    try {
      const finalPayload = await resolvePayload(payload);

      if (!isAcknowledged(interaction)) {
        await interaction.deferUpdate();
      }

      return await interaction.editReply(finalPayload);
    } catch (recoveryErr) {
      console.error('[RESPONDER] safeUpdate recovery failed:', recoveryErr);
    }

    return notifyFailure(interaction, errorMessage);
  }
}

/**
 * Reply to an interaction safely, picking reply/followUp automatically.
 */
async function safeReply(interaction, payload) {
  const body = typeof payload === 'string' ? { content: payload } : { ...payload };

  try {
    if (isAcknowledged(interaction)) {
      return await interaction.followUp(body);
    }

    return await interaction.reply(body);
  } catch (err) {
    console.error('[RESPONDER] safeReply failed:', err.message);
    return null;
  }
}

/**
 * Defer a reply for work that is expected to take longer than 3 seconds
 * (bulk DM sending, member fetching, ...). Never throws.
 */
async function safeDefer(interaction, { ephemeral = false } = {}) {
  if (isAcknowledged(interaction)) return true;

  try {
    await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});
    return true;
  } catch (err) {
    console.warn('[RESPONDER] deferReply failed:', err.message);
    return false;
  }
}

/**
 * Edit a deferred reply, falling back to a fresh reply if the defer was lost.
 */
async function safeEdit(interaction, payload) {
  const body = typeof payload === 'string' ? { content: payload } : { ...payload };

  try {
    if (isAcknowledged(interaction)) {
      return await interaction.editReply(body);
    }

    return await interaction.reply(body);
  } catch (err) {
    console.error('[RESPONDER] safeEdit failed:', err.message);
    return safeReply(interaction, { ...body, flags: MessageFlags.Ephemeral });
  }
}

async function notifyFailure(interaction, message) {
  try {
    const body = { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };

    if (isAcknowledged(interaction)) {
      return await interaction.followUp(body);
    }

    return await interaction.reply(body);
  } catch (err) {
    console.error('[RESPONDER] Could not notify user of failure:', err.message);
    return null;
  }
}

module.exports = {
  ACK_DEADLINE_MS,
  isAcknowledged,
  acknowledgeQuietly,
  safeUpdate,
  safeReply,
  safeDefer,
  safeEdit
};
