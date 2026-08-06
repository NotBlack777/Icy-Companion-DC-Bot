/**
 * Theme DM commands
 * -----------------
 * Junior owners and above can switch, test and save bot UI themes from DMs.
 */

const registry = require('../registry');
const ui = require('../ui');
const {
  getTheme,
  getThemeConfig,
  setThemePreset,
  setCustomTheme,
  saveTheme,
  deleteSavedTheme,
  resetTheme,
  resolveTheme,
  themeSummary,
  listThemes,
  intToHex,
  hexToInt,
  slugThemeName
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

function explainAccent() {
  return [
    '**Accent** controls the icy highlight layer:',
    '> buttons/help accents, sky/ice/glacier shades, thumbnails/secondary stat vibes, and the cool side of the orange → blue theme.',
    '**Primary** is the main embed color. **Secondary** is the warm/orange action color.'
  ].join('\n');
}

function themeLine(theme) {
  const marker = theme.type === 'saved' ? '💾' : '◆';
  return [
    `${marker} **${theme.id}** — ${theme.label}`,
    `> ${theme.description}`,
    `> Primary \`${theme.primary}\` • Secondary \`${theme.secondary}\` • Accent \`${theme.accent}\``
  ].join('\n');
}

function parseMaybeThemeTest(args) {
  const first = String(args.target || '').trim();
  const secondary = args.secondary ? String(args.secondary).trim() : null;
  const accent = args.accent ? String(args.accent).trim() : null;

  if (secondary || accent || /^#?[0-9a-fA-F]{6}$/.test(first)) {
    if (!secondary || !accent) {
      throw new Error('Testing raw colors needs all three hex values: primary, secondary and accent.');
    }

    return {
      id: 'preview',
      label: 'Unsaved Preview',
      description: 'Temporary preview theme.',
      frost: hexToInt(first, 'primary'),
      orange: hexToInt(secondary, 'secondary'),
      sky: hexToInt(accent, 'accent'),
      divider: '🎨━━━━━━━━━━━━━━━━━━━━🧊',
      footer: '🎨 Icy Companion • Theme Preview',
      interfaceName: 'Theme Preview Interface'
    };
  }

  const theme = resolveTheme(first);
  if (!theme) throw new Error(`Theme \`${first}\` was not found. Run \`@bot theme list\`.`);
  return theme;
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
        explainAccent(),
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
  desc: 'List available UI themes, including saved custom themes',
  async run() {
    const themes = listThemes();
    const presets = themes.filter(theme => theme.type === 'preset');
    const saved = themes.filter(theme => theme.type === 'saved');

    return {
      embeds: [themeEmbed('Theme Library', [
        'Pick one with `@bot theme set <name>` or preview with `@bot theme test <name>`.',
        '',
        '**Built-in Presets**',
        ...presets.map(themeLine),
        '',
        '**Saved Custom Themes**',
        ...(saved.length ? saved.map(themeLine) : ['> _No saved custom themes yet. Use `@bot theme save <name>`._']),
        '',
        '**Custom unsaved:** `@bot theme custom <primary> <secondary> <accent> [name]`'
      ], ICY.orange)]
    };
  }
});

registry.define({
  name: 'theme set',
  aliases: ['set theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme set <preset/saved-name>',
  desc: 'Set a UI theme preset or saved custom theme',
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
  usage: '@bot theme custom <primary hex> <secondary hex> <accent hex> [name]',
  desc: 'Apply an unsaved custom UI theme with three hex colors',
  args: [
    { name: 'primary', type: 'word', required: true, desc: 'Main embed hex, e.g. #00D4FF' },
    { name: 'secondary', type: 'word', required: true, desc: 'Warm/action hex, e.g. #FB8500' },
    { name: 'accent', type: 'word', required: true, desc: 'Icy highlight hex, e.g. #38BDF8' },
    { name: 'name', type: 'rest', required: false, desc: 'Optional display name' }
  ],
  async run({ args }) {
    try {
      setCustomTheme({
        primary: args.primary,
        secondary: args.secondary,
        accent: args.accent,
        name: args.name || 'Custom Theme'
      });
    } catch (err) {
      return { embeds: [ui.error('Invalid Custom Theme', err.message)] };
    }

    const theme = getTheme();
    return {
      embeds: [themeEmbed('Custom Theme Applied', [
        'Your custom theme is now active globally, but it is not saved yet.',
        `Save it with \`@bot theme save ${slugThemeName(theme.label) || 'my-theme'}\`.`,
        '',
        ui.bullet(summaryLines(theme)),
        '',
        explainAccent()
      ], theme.frost)]
    };
  }
});

registry.define({
  name: 'theme save',
  aliases: ['save theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme save <name> [primary hex] [secondary hex] [accent hex]',
  desc: 'Save the active or provided custom theme into the theme library',
  args: [
    { name: 'name', type: 'word', required: true },
    { name: 'primary', type: 'word', required: false },
    { name: 'secondary', type: 'word', required: false },
    { name: 'accent', type: 'word', required: false }
  ],
  async run({ args }) {
    let saved;

    try {
      const hasColors = args.primary || args.secondary || args.accent;
      if (hasColors && (!args.primary || !args.secondary || !args.accent)) {
        throw new Error('To save colors directly, provide primary, secondary and accent hex values.');
      }

      saved = saveTheme(args.name, hasColors ? args : null);
    } catch (err) {
      return { embeds: [ui.error('Could Not Save Theme', err.message)] };
    }

    return {
      embeds: [themeEmbed('Theme Saved', [
        `Saved as **${saved.theme.label}** with ID \`${saved.slug}\`.`,
        'It now appears in `@bot theme list` and can be applied with `@bot theme set <name>`.',
        '',
        ui.bullet(summaryLines(saved.theme))
      ], saved.theme.orange)]
    };
  }
});

registry.define({
  name: 'theme delete',
  aliases: ['delete theme', 'theme remove', 'remove theme'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme delete <saved-name>',
  desc: 'Delete a saved custom theme',
  args: [{ name: 'name', type: 'word', required: true }],
  async run({ args }) {
    deleteSavedTheme(args.name);
    return { embeds: [themeEmbed('Theme Deleted', `Removed saved theme \`${args.name}\` if it existed.`, ICY.warn)] };
  }
});

registry.define({
  name: 'theme test',
  aliases: ['test theme', 'theme preview'],
  group: 'management',
  tier: 'junior',
  usage: '@bot theme test <theme-name OR primary hex> [secondary hex] [accent hex]',
  desc: 'Preview a saved/preset theme or three raw hex colors without applying it',
  args: [
    { name: 'target', type: 'word', required: true, desc: 'Theme name or primary hex' },
    { name: 'secondary', type: 'word', required: false, desc: 'Secondary hex when testing raw colors' },
    { name: 'accent', type: 'word', required: false, desc: 'Accent hex when testing raw colors' }
  ],
  async run({ args }) {
    let theme;
    try {
      theme = parseMaybeThemeTest(args);
    } catch (err) {
      return { embeds: [ui.error('Theme Test Failed', err.message)] };
    }

    return {
      embeds: [themeEmbed('Theme Preview', [
        `Previewing **${theme.label}** — this did **not** change the active theme.`,
        '',
        ui.bullet(summaryLines(theme)),
        '',
        explainAccent(),
        '',
        `**Preview:** ${theme.divider}`
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
