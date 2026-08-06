const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');
const { createEmbed, COLORS } = require('../../utils/uiHelper');
const {
  cleanCommandName,
  cleanModuleName,
  listMaintenance,
  setModuleMaintenance,
  setCommandMaintenance
} = require('../../utils/maintenance');

const MODULE_CHOICES = [
  'moderation',
  'attendance',
  'staff',
  'reports',
  'owner',
  'utility',
  'fun',
  'settings'
].map(name => ({ name, value: name }));

function renderEntry(entry) {
  const updated = entry.at ? `<t:${Math.floor(new Date(entry.at).getTime() / 1000)}:R>` : 'unknown';
  return `> **${entry.name}** — ${entry.note || 'No note'}\n> Changed ${updated}${entry.by ? ` by <@${entry.by}>` : ''}`;
}

function statusEmbed(config) {
  const list = listMaintenance(config);

  if (!list.total) {
    return createEmbed({
      title: 'Maintenance List',
      description: 'Everything is live. No modules or commands are under maintenance.',
      color: COLORS.success,
      compact: true
    });
  }

  return createEmbed({
    title: 'Maintenance List',
    description: [
      `**Total disabled:** \`${list.total}\``,
      '',
      `**Modules (${list.modules.length})**`,
      list.modules.length ? list.modules.map(renderEntry).join('\n') : '> _None_',
      '',
      `**Commands (${list.commands.length})**`,
      list.commands.length ? list.commands.map(renderEntry).join('\n') : '> _None_'
    ].join('\n'),
    color: COLORS.warn,
    compact: true
  });
}

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Put modules or individual commands under maintenance')
    .addSubcommand(sub =>
      sub
        .setName('module')
        .setDescription('Enable/disable maintenance for a whole command category')
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Command category/module')
            .setRequired(true)
            .addChoices(...MODULE_CHOICES)
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('True = under maintenance, False = live')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('note')
            .setDescription('Maintenance note shown to users')
            .setRequired(false)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('command')
        .setDescription('Enable/disable maintenance for one command')
        .addStringOption(opt =>
          opt.setName('command')
            .setDescription('Command name without slash, e.g. ban or bot-info')
            .setRequired(true)
            .setMaxLength(64)
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('True = under maintenance, False = live')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('note')
            .setDescription('Maintenance note shown to users')
            .setRequired(false)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Show all modules and commands under maintenance')
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      return interaction.reply({ embeds: [statusEmbed(config)], ephemeral: true });
    }

    const enabled = interaction.options.getBoolean('enabled');
    const note = interaction.options.getString('note') || 'Temporarily under maintenance. Please try again later.';

    if (subcommand === 'module') {
      const moduleName = cleanModuleName(interaction.options.getString('module'));
      setModuleMaintenance(config, moduleName, enabled, note, interaction.user.id);
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [createEmbed({
          title: enabled ? 'Module Under Maintenance' : 'Module Back Online',
          description: enabled
            ? `The \`${moduleName}\` module is now under maintenance.\n\n**Note shown:** ${note}`
            : `The \`${moduleName}\` module is live again.`,
          color: enabled ? COLORS.warn : COLORS.success,
          compact: true
        })],
        ephemeral: true
      });
    }

    const commandName = cleanCommandName(interaction.options.getString('command'));
    setCommandMaintenance(config, commandName, enabled, note, interaction.user.id);
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      embeds: [createEmbed({
        title: enabled ? 'Command Under Maintenance' : 'Command Back Online',
        description: enabled
          ? `The \`/${commandName}\` command is now under maintenance.\n\n**Note shown:** ${note}`
          : `The \`/${commandName}\` command is live again.`,
        color: enabled ? COLORS.warn : COLORS.success,
        compact: true
      })],
      ephemeral: true
    });
  }
};
