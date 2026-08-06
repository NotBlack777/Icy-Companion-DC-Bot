const { SlashCommandBuilder } = require('discord.js');
const { guard } = require('../../utils/guildAuth');
const { createEmbed, COLORS } = require('../../utils/uiHelper');
const {
  getTheme,
  getThemeConfig,
  listThemes,
  setThemePreset,
  setCustomTheme,
  resetTheme,
  themeSummary,
  intToHex,
  resolveTheme,
  hexToInt
} = require('../../utils/themeManager');

function summary(theme = getTheme()) {
  const data = themeSummary(theme);
  return [
    `**Name:** ${data.Name}`,
    `**Primary:** \`${data.Primary}\``,
    `**Secondary:** \`${data.Secondary}\``,
    `**Accent:** \`${data.Accent}\``
  ].join('\n');
}

function themeList() {
  return listThemes().map(theme =>
    `> **${theme.id}** — ${theme.label}\n> \`${theme.primary}\` • \`${theme.secondary}\` • \`${theme.accent}\``
  ).join('\n').slice(0, 3900);
}

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('theme')
    .setDescription('Configure this server UI theme')
    .addSubcommand(sub => sub.setName('status').setDescription('Show this server theme'))
    .addSubcommand(sub => sub.setName('list').setDescription('List available global/saved themes'))
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set this server to a preset or saved theme')
        .addStringOption(opt => opt.setName('name').setDescription('Theme name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('custom')
        .setDescription('Set a custom theme for this server')
        .addStringOption(opt => opt.setName('primary').setDescription('Primary hex, e.g. #00D4FF').setRequired(true))
        .addStringOption(opt => opt.setName('secondary').setDescription('Secondary hex, e.g. #FB8500').setRequired(true))
        .addStringOption(opt => opt.setName('accent').setDescription('Accent hex, e.g. #38BDF8').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Display name').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Preview a theme or raw colors without applying')
        .addStringOption(opt => opt.setName('target').setDescription('Theme name or primary hex').setRequired(true))
        .addStringOption(opt => opt.setName('secondary').setDescription('Secondary hex if using raw colors').setRequired(false))
        .addStringOption(opt => opt.setName('accent').setDescription('Accent hex if using raw colors').setRequired(false)))
    .addSubcommand(sub => sub.setName('reset').setDescription('Use the global theme again')),

  async execute(interaction) {
    const { ok } = await guard(interaction, 'owner');
    if (!ok) return;

    const target = { guildId: interaction.guild.id };
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      return interaction.reply({ embeds: [createEmbed({ title: 'Theme Library', description: themeList(), color: COLORS.orange, compact: true })], ephemeral: true });
    }

    if (sub === 'status') {
      const config = getThemeConfig();
      return interaction.reply({ embeds: [createEmbed({
        title: 'Server Theme',
        description: [`**Config:** \`${config.preset || 'global'}\``, '', summary(getTheme())].join('\n'),
        color: COLORS.frost,
        compact: true
      })], ephemeral: true });
    }

    if (sub === 'reset') {
      resetTheme(target);
      return interaction.reply({ embeds: [createEmbed({ title: 'Theme Reset', description: 'This server now uses the global theme again.', color: COLORS.success, compact: true })], ephemeral: true });
    }

    if (sub === 'set') {
      try {
        setThemePreset(interaction.options.getString('name'), target);
      } catch (err) {
        return interaction.reply({ embeds: [createEmbed({ title: 'Unknown Theme', description: err.message, color: COLORS.error, compact: true })], ephemeral: true });
      }

      return interaction.reply({ embeds: [createEmbed({ title: 'Theme Applied', description: summary(getTheme()), color: COLORS.orange, compact: true })], ephemeral: true });
    }

    if (sub === 'custom') {
      try {
        setCustomTheme({
          primary: interaction.options.getString('primary'),
          secondary: interaction.options.getString('secondary'),
          accent: interaction.options.getString('accent'),
          name: interaction.options.getString('name') || `${interaction.guild.name} Theme`
        }, target);
      } catch (err) {
        return interaction.reply({ embeds: [createEmbed({ title: 'Invalid Theme', description: err.message, color: COLORS.error, compact: true })], ephemeral: true });
      }

      return interaction.reply({ embeds: [createEmbed({ title: 'Custom Server Theme Applied', description: summary(getTheme()), color: COLORS.frost, compact: true })], ephemeral: true });
    }

    const targetValue = interaction.options.getString('target');
    const secondary = interaction.options.getString('secondary');
    const accent = interaction.options.getString('accent');
    let theme;

    try {
      if (secondary || accent || /^#?[0-9a-fA-F]{6}$/.test(targetValue)) {
        if (!secondary || !accent) throw new Error('Raw preview requires primary, secondary and accent hex values.');
        theme = {
          label: 'Preview',
          frost: hexToInt(targetValue, 'primary'),
          orange: hexToInt(secondary, 'secondary'),
          sky: hexToInt(accent, 'accent')
        };
      } else {
        theme = resolveTheme(targetValue);
        if (!theme) throw new Error(`Theme \`${targetValue}\` was not found.`);
      }
    } catch (err) {
      return interaction.reply({ embeds: [createEmbed({ title: 'Theme Preview Failed', description: err.message, color: COLORS.error, compact: true })], ephemeral: true });
    }

    return interaction.reply({ embeds: [createEmbed({
      title: 'Theme Preview',
      description: [
        `**Name:** ${theme.label}`,
        `**Primary:** \`${intToHex(theme.frost)}\``,
        `**Secondary:** \`${intToHex(theme.orange)}\``,
        `**Accent:** \`${intToHex(theme.sky)}\``,
        '',
        'This did not apply the theme.'
      ].join('\n'),
      color: theme.frost,
      compact: true
    })], ephemeral: true });
  }
};
