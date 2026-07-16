module.exports = async function safeRun(command, interaction, client, config) {
  try {

    // ❌ command missing
    if (!command) {
      console.warn(`[SAFE] Missing command: ${interaction.commandName}`);

      return interaction.reply({
        content: '⚠️ Command is missing or not loaded.',
        ephemeral: true
      });
    }

    // ❌ execute missing
    if (typeof command.execute !== 'function') {
      console.warn(`[SAFE] No execute() in: ${interaction.commandName}`);

      return interaction.reply({
        content: '⚠️ This command is broken (no execute function).',
        ephemeral: true
      });
    }

    // 🧠 auto-fix missing config
    if (!config) {
      console.warn(`[SAFE] Missing config for guild`);

      config = {
        attendance: { users: {} },
        ignoreUsers: [],
        ignoreChannels: [],
        extraOwners: []
      };
    }

    // ⏳ run command safely
    await command.execute(interaction, client, config);

  } catch (err) {
    console.error(`[SAFE ERROR] ${interaction.commandName}`, err);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Command failed safely. Error handled.',
          ephemeral: true
        });
      }
    } catch (e) {
      console.error('Even safe reply failed:', e);
    }
  }
};