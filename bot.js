require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes
} = require('discord.js');

const fs = require('fs');
const path = require('path');

/* ---------------- ENV ---------------- */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PREFIX = '.';

/* ---------------- CHECK ---------------- */

if (!TOKEN) {
  console.log('❌ TOKEN missing');
  process.exit(1);
}

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],

  partials: [Partials.Channel]
});

/* ---------------- COMMAND COLLECTION ---------------- */

client.commands = new Collection();

/* ---------------- LOAD COMMANDS ---------------- */

function loadCommands() {

  client.commands.clear();

  const basePath = path.join(__dirname, 'src', 'commands');

  let loaded = 0;
  let failed = 0;

  function walk(dir) {

    const files = fs.readdirSync(dir);

    for (const file of files) {

      const fullPath = path.join(dir, file);

      const stat = fs.statSync(fullPath);

      // 📁 folders
      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      // ❌ ignore non-js
      if (!file.endsWith('.js')) continue;

      try {

        delete require.cache[require.resolve(fullPath)];

        const command = require(fullPath);

        // validation
        if (!command?.data?.name) {
          failed++;
          console.log(`❌ ${file} → Missing name`);
          continue;
        }

        if (!command?.data?.description) {
          failed++;
          console.log(`❌ ${file} → Missing description`);
          continue;
        }

        if (typeof command.execute !== 'function') {
          failed++;
          console.log(`❌ ${file} → Missing execute`);
          continue;
        }

        client.commands.set(
          command.data.name.toLowerCase(),
          command
        );

        loaded++;

      } catch (err) {

        failed++;

        console.log(`❌ ${file}`);
        console.log(`   ↳ ${err.message}`);
      }
    }
  }

  walk(basePath);

  console.log(`📦 Loaded ${loaded} commands`);

  if (failed > 0) {
    console.log(`❌ Failed ${failed} commands`);
  }
}

/* ---------------- SYNC SLASH COMMANDS ---------------- */

async function syncCommands() {

  const commands = [];

  let synced = 0;
  let failed = 0;

  client.commands.forEach(cmd => {

    try {

      const json = cmd.data.toJSON();

      commands.push(json);

      synced++;

    } catch (err) {

      failed++;

      console.log(`❌ ${cmd?.data?.name || 'UNKNOWN COMMAND'}`);
      console.log(`   ↳ ${err.message}`);
    }
  });

  const rest = new REST({ version: '10' })
    .setToken(TOKEN);

  try {

    console.log(`🔄 Syncing ${synced} commands...`);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Synced ${synced} commands`);

    if (failed > 0) {
      console.log(`❌ Failed ${failed} commands`);
    }

  } catch (err) {

    console.log('❌ Sync failed');
    console.log(err.message);

  }
}

/* ---------------- READY ---------------- */

client.once('clientReady', async () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

  // load commands
  loadCommands();

  // sync commands
  await syncCommands();
});

/* ---------------- INTERACTIONS ---------------- */

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(
    interaction.commandName.toLowerCase()
  );

  if (!command) {
    return interaction.reply({
      content: '❌ Command not found',
      ephemeral: true
    });
  }

  try {

    await command.execute(interaction, client);

  } catch (err) {

    console.log(`❌ Command Error → ${interaction.commandName}`);
    console.log(err);

    const msg =
      `❌ Error: ${err.message || 'Unknown error'}`;

    if (interaction.replied || interaction.deferred) {

      await interaction.followUp({
        content: msg,
        ephemeral: true
      });

    } else {

      await interaction.reply({
        content: msg,
        ephemeral: true
      });
    }
  }
});

/* ---------------- PREFIX ---------------- */

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/ +/);

  const cmd = args.shift()?.toLowerCase();

  // future prefix commands
});

/* ---------------- ERROR HANDLING ---------------- */

process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection');
  console.log(err);
});

process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception');
  console.log(err);
});

/* ---------------- LOGIN ---------------- */

client.login(TOKEN);