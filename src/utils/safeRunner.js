const { recordAudit } = require('./auditLog');

async function replySafely(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp(payload);
    }

    return interaction.reply(payload);
  } catch (err) {
    console.error('[SAFE] Failed to send error reply:', err);
    return null;
  }
}

module.exports = async function safeRun(command, interaction, client, config) {
  try {
    if (!command) {
      console.warn(`[SAFE] Missing command: ${interaction.commandName}`);
      return replySafely(interaction, {
        content: '⚠️ Command is missing or not loaded.',
        ephemeral: true
      });
    }

    if (typeof command.execute !== 'function') {
      console.warn(`[SAFE] No execute() in: ${interaction.commandName}`);
      return replySafely(interaction, {
        content: '⚠️ This command is broken (no execute function).',
        ephemeral: true
      });
    }

    const safeConfig = config || {
      attendance: { users: {} },
      ignoreUsers: [],
      ignoreChannels: [],
      ignoreRoles: [],
      extraOwners: []
    };

    const result = await command.execute(interaction, client, safeConfig);

    if (command.category === 'owner' || command.category === 'settings' || command.category === 'dm') {
      recordAudit({
        surface: 'slash',
        command: interaction.commandName,
        category: command.category,
        userId: interaction.user?.id,
        guildId: interaction.guild?.id || null,
        channelId: interaction.channel?.id || null,
        status: 'ok'
      });
    }

    return result;
  } catch (err) {
    console.error(`[SAFE ERROR] ${interaction.commandName}`, err);
    recordAudit({
      surface: 'slash',
      command: interaction.commandName,
      category: command?.category || null,
      userId: interaction.user?.id,
      guildId: interaction.guild?.id || null,
      channelId: interaction.channel?.id || null,
      status: 'error',
      error: String(err.message || err).slice(0, 300)
    });

    return replySafely(interaction, {
      content: '❌ Command failed safely. Error handled.',
      ephemeral: true
    });
  }
};
