/**
 * Theme DM commands
 * -----------------
 * Junior owners and above can switch the bot UI theme from DMs.
 */

const registry = require('../registry');
const ui = require('../ui');
const {
  getTheme,
  getThemeConfig,
  setThemePreset,
  setCustomTheme,
  resetTheme,
  themeSummary,
  listPresets,
  intToHex,
  hexToInt
} = require('../../utils/themeManager');

const { ICY } = ui;

function themeEmbed(title, body, color = ICY.frost) {
  return ui.panel(title, body, {
    color,
    author: { name: '🌅 Icy Companion • Theme Studio' },
    footer: 'Theme Studio • Junior Owner+' 
  });
}

function summaryLines(theme = getTheme()) {
  const summary = themeSummary(theme);
  return [
    `**Name:** ${summary.Name}`,
    `**Primary:** \`${summary.Primary}\``,
    `**Secondary:** \`${summary.Secondary}\``,
    `**Accent:** \`${summary.Accent}\``,
    `**Footer:** ${summary.Footer}`
  ];
}

function presetListLines() {
  return listPresets().map(preset => [
    `**${preset.id}** — ${preset.label}`,
    `> ${preset.description}`,
    `> Primary \`${preset.primary}\` • Secondary \`${preset.secondary}\` • Accent \`${preset.accent}\``
  ].join('\n'));
}

registry.define({
  name: 'theme status',
  aliases: ['theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme status',
  desc: 'Show the active bot UI theme',
  async run() {
    const config = getThemeConfig();
    const theme = getTheme();

    return {
      embeds: [themeEmbed('Active Theme', [
        `**Mode:** \`${config.preset}\``,
        '',
        ui.bullet(summaryLines(theme)),
        '',
        `**Preview:** ${theme.divider}`
      ], theme.frost)]
    };
  }
});

registry.define({
  name: 'theme list',
  aliases: ['themes', 'theme presets'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme list',
  desc: 'List available UI theme presets',
  async run() {
    return {
      embeds: [themeEmbed('Theme Presets', [
        'Pick one with `@bot theme set <preset>`.',
        '',
        ...presetListLines(),
        '',
        '**Custom:** `@bot theme custom <primary> <secondary> <accent>`'
      ], ICY.orange)]
    };
  }
});

registry.define({
  name: 'theme set',
  aliases: ['set theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme set <preset>',
  desc: 'Set a UI theme preset',
  args: [{ name: 'preset', type: 'word', required: true }],
  async run({ args }) {
    try {
      setThemePreset(args.preset);
    } catch (err) {
      return { embeds: [ui.error('Unknown Theme', err.message)] };
    }

    const theme = getTheme();
    return {
      embeds: [themeEmbed('Theme Applied', [
        `Switched to **${theme.label}**.`,
        '',
        ui.bullet(summaryLines(theme)),
        '',
        `**Preview:** ${theme.divider}`
      ], theme.orange)]
    };
  }
});

registry.define({
  name: 'theme custom',
  aliases: ['custom theme', 'theme set custom'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme custom <primary hex> <secondary hex> <accent hex>',
  desc: 'Set a custom UI theme with three hex colors',
  args: [
    { name: 'primary', type: 'word', required: true, desc: 'Primary hex color, e.g. #00D4FF' },
    { name: 'secondary', type: 'word', required: true, desc: 'Secondary hex color, e.g. #FB8500' },
    { name: 'accent', type: 'word', required: true, desc: 'Accent hex color, e.g. #38BDF8' }
  ],
  async run({ args }) {
    try {
      // Validate before writing so the user gets a clean error.
      hexToInt(args.primary, 'primary');
      hexToInt(args.secondary, 'secondary');
      hexToInt(args.accent, 'accent');
      setCustomTheme(args);
    } catch (err) {
      return { embeds: [ui.error('Invalid Custom Theme', err.message)] };
    }

    const theme = getTheme();
    return {
      embeds: [themeEmbed('Custom Theme Applied', [
        'Your custom theme is now active globally.',
        '',
        ui.bullet(summaryLines(theme)),
        '',
        `**Raw:** primary \`${intToHex(theme.frost)}\`, secondary \`${intToHex(theme.orange)}\`, accent \`${intToHex(theme.sky)}\``
      ], theme.frost)]
    };
  }
});

registry.define({
  name: 'theme reset',
  aliases: ['reset theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme reset',
  desc: 'Reset the UI theme to Sunset Ice',
  async run() {
    resetTheme();
    const theme = getTheme();

    return {
      embeds: [themeEmbed('Theme Reset', [
        'Theme reset to the default **Sunset Ice** look.',
        '',
        ui.bullet(summaryLines(theme))
      ], theme.frost)]
    };
  }
});

module.exports = {};
