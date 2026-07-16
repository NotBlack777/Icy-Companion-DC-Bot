const fs = require('fs');
const path = require('path');

module.exports = (client) => {

  client.commands.clear();

  const commandsPath = path.join(__dirname, '../commands');

  let loaded = 0;
  let failed = 0;

  const folders = fs.readdirSync(commandsPath).filter(folder =>
    fs.statSync(path.join(commandsPath, folder)).isDirectory()
  );

  for (const folder of folders) {

    const folderPath = path.join(commandsPath, folder);

    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.js'));

    for (const file of files) {

      try {

        const filePath = path.join(folderPath, file);

        delete require.cache[
          require.resolve(filePath)
        ];

        const command = require(filePath);

        if (!command?.data?.name) {
          console.log(`[SKIPPED] ${file} (missing data.name)`);
          continue;
        }

        // DEBUG CATEGORY
        console.log(
          `[LOAD] ${command.data.name} | category=${command.category || 'undefined'}`
        );

        client.commands.set(
          command.data.name,
          command
        );

        loaded++;

      } catch (err) {

        failed++;

        console.log(
          `[ERROR LOADING] ${file} ${err.message}`
        );
      }
    }
  }

  console.log(
    `🔄 Loaded ${loaded} commands (${failed} failed)`
  );
};