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

    return await command.execute(interaction, client, safeConfig);
  } catch (err) {
    console.error(`[SAFE ERROR] ${interaction.commandName}`, err);

    return replySafely(interaction, {
      content: '❌ Command failed safely. Error handled.',
      ephemeral: true
    });
  }
};
