const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  if (!client?.commands) {
    throw new Error('client.commands collection is required');
  }

  client.commands.clear();

  const commandsPath = path.join(__dirname, '../commands');
  let loaded = 0;
  let failed = 0;

  if (!fs.existsSync(commandsPath)) {
    console.warn(`[COMMANDS] Commands folder not found: ${commandsPath}`);
    return { loaded, failed };
  }

  function walk(dir, category = 'other') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, entry.name);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

      try {
        delete require.cache[require.resolve(fullPath)];
        const command = require(fullPath);

        if (!command?.data?.name) {
          failed++;
          console.log(`[SKIPPED] ${entry.name} (missing data.name)`);
          continue;
        }

        if (!command?.data?.description) {
          failed++;
          console.log(`[SKIPPED] ${entry.name} (missing data.description)`);
          continue;
        }

        if (typeof command.execute !== 'function') {
          failed++;
          console.log(`[SKIPPED] ${entry.name} (missing execute function)`);
          continue;
        }

        command.category = command.category || category;
        command.folder = command.folder || category;

        client.commands.set(command.data.name.toLowerCase(), command);
        loaded++;
      } catch (err) {
        failed++;
        console.log(`[ERROR LOADING] ${entry.name}: ${err.stack || err.message}`);
      }
    }
  }

  walk(commandsPath);

  console.log(`🔄 Loaded ${loaded} commands (${failed} failed)`);
  return { loaded, failed };
}

module.exports = loadCommands;
module.exports.loadCommands = loadCommands;
