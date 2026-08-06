const store = require('./globalStore');

const PRESETS = {
  'sunset-ice': {
    id: 'sunset-ice',
    label: 'Sunset Ice',
    description: 'Warm yellow/orange sunrise blended into icy sky blue.',
    frost: 0x00d4ff,
    sky: 0x38bdf8,
    ice: 0x7dd3fc,
    glacier: 0x0ea5e9,
    sunrise: 0xffb703,
    orange: 0xfb8500,
    amber: 0xffd166,
    deep: 0x101722,
    success: 0x00f5a0,
    error: 0xff3d71,
    warn: 0xfb8500,
    violet: 0xfb8500,
    pink: 0xff6b35,
    mint: 0x00f5d4,
    footer: '🌅 Icy Companion • Sunset Ice UI',
    divider: '🟨🟧━━━━━━━━━━━━━━━━━━🟦❄️',
    thin: '🟧────────────────────🧊',
    glow: '🌅 ✦ 🟧 ✦ 🧊 ✦ 🟦 ✦ ❄️',
    interfaceName: 'Sunset Ice Interface'
  },

  arctic: {
    id: 'arctic',
    label: 'Arctic Blue',
    description: 'Pure icy cyan, glacier blue and clean winter contrast.',
    frost: 0x7dd3fc,
    sky: 0x38bdf8,
    ice: 0xbae6fd,
    glacier: 0x0284c7,
    sunrise: 0xfacc15,
    orange: 0x38bdf8,
    amber: 0xfacc15,
    deep: 0x07111f,
    success: 0x22c55e,
    error: 0xf43f5e,
    warn: 0xfacc15,
    violet: 0x38bdf8,
    pink: 0x0ea5e9,
    mint: 0x2dd4bf,
    footer: '🧊 Icy Companion • Arctic UI',
    divider: '🧊━━━━━━━━━━━━━━━━━━━━❄️',
    thin: '❄️────────────────────🧊',
    glow: '🧊 ✦ ❄️ ✦ 🟦 ✦ ❄️ ✦ 🧊',
    interfaceName: 'Arctic Interface'
  },

  aurora: {
    id: 'aurora',
    label: 'Aurora',
    description: 'Icy cyan with mint and violet aurora accents.',
    frost: 0x22d3ee,
    sky: 0x06b6d4,
    ice: 0xa5f3fc,
    glacier: 0x0891b2,
    sunrise: 0xa78bfa,
    orange: 0x8b5cf6,
    amber: 0xc084fc,
    deep: 0x111827,
    success: 0x34d399,
    error: 0xfb7185,
    warn: 0xfbbf24,
    violet: 0x8b5cf6,
    pink: 0xec4899,
    mint: 0x2dd4bf,
    footer: '🌌 Icy Companion • Aurora UI',
    divider: '🟦🟩━━━━━━━━━━━━━━━━━━🟪✨',
    thin: '🟩────────────────────🟪',
    glow: '🌌 ✦ 🟩 ✦ 🧊 ✦ 🟪 ✦ ✨',
    interfaceName: 'Aurora Interface'
  },

  ember: {
    id: 'ember',
    label: 'Ember Sky',
    description: 'Stronger orange/yellow with icy blue highlights.',
    frost: 0x38bdf8,
    sky: 0x0ea5e9,
    ice: 0x93c5fd,
    glacier: 0x2563eb,
    sunrise: 0xfacc15,
    orange: 0xf97316,
    amber: 0xfbbf24,
    deep: 0x18120c,
    success: 0x22c55e,
    error: 0xef4444,
    warn: 0xf97316,
    violet: 0xf97316,
    pink: 0xfb7185,
    mint: 0x14b8a6,
    footer: '🔥 Icy Companion • Ember Sky UI',
    divider: '🟨🔥━━━━━━━━━━━━━━━━━━🧊🟦',
    thin: '🔥────────────────────🧊',
    glow: '🔥 ✦ 🟨 ✦ 🌅 ✦ 🧊 ✦ 🟦',
    interfaceName: 'Ember Ice Interface'
  },

  violet: {
    id: 'violet',
    label: 'Violet Legacy',
    description: 'The previous purple cyber look.',
    frost: 0x8b5cf6,
    sky: 0xa78bfa,
    ice: 0xc4b5fd,
    glacier: 0x7c3aed,
    sunrise: 0xffb703,
    orange: 0x9333ea,
    amber: 0xf59e0b,
    deep: 0x14111f,
    success: 0x22c55e,
    error: 0xf43f5e,
    warn: 0xf59e0b,
    violet: 0x9333ea,
    pink: 0xec4899,
    mint: 0x14b8a6,
    footer: '◈ Icy Companion • Violet UI',
    divider: '🟪━━━━━━━━━━━━━━━━━━━━🔮',
    thin: '🔮────────────────────🟪',
    glow: '✦ ◆ ✦ ◆ ✦ ◆ ✦ ◆ ✦ ◆ ✦',
    interfaceName: 'Violet Interface'
  }
};

const DEFAULT_PRESET = 'sunset-ice';
const COLOR_KEYS = [
  'frost', 'sky', 'ice', 'glacier', 'sunrise', 'orange', 'amber', 'deep',
  'success', 'error', 'warn', 'violet', 'pink', 'mint'
];

function hexToInt(value, name = 'color') {
  const raw = String(value || '').trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    throw new Error(`${name} must be a 6-digit hex color like #00D4FF.`);
  }

  return Number.parseInt(raw, 16);
}

function intToHex(value) {
  return `#${Number(value || 0).toString(16).toUpperCase().padStart(6, '0')}`;
}

function normalizeThemeConfig(config = {}) {
  const requested = String(config.preset || DEFAULT_PRESET).toLowerCase();
  const preset = requested === 'custom' || PRESETS[requested] ? requested : DEFAULT_PRESET;

  return {
    preset,
    custom: config.custom && typeof config.custom === 'object' ? config.custom : null
  };
}

function getThemeConfig() {
  return normalizeThemeConfig(store.load().theme);
}

function buildCustomTheme(custom = {}) {
  const base = PRESETS[DEFAULT_PRESET];
  const primary = Number(custom.primary || base.frost);
  const secondary = Number(custom.secondary || base.orange);
  const accent = Number(custom.accent || base.sky);

  return {
    ...base,
    id: 'custom',
    label: custom.name || 'Custom Theme',
    description: 'Your custom Icy Companion theme.',
    frost: primary,
    sky: accent,
    ice: accent,
    glacier: accent,
    sunrise: secondary,
    orange: secondary,
    amber: secondary,
    violet: secondary,
    warn: secondary,
    footer: custom.footer || '🎨 Icy Companion • Custom UI',
    divider: custom.divider || '🎨━━━━━━━━━━━━━━━━━━━━🧊',
    thin: custom.thin || '🎨────────────────────🧊',
    glow: custom.glow || '🎨 ✦ 🌅 ✦ 🧊 ✦ ✨',
    interfaceName: custom.interfaceName || 'Custom Interface'
  };
}

function getTheme() {
  const config = getThemeConfig();
  if (config.preset === 'custom' && config.custom) return buildCustomTheme(config.custom);
  return PRESETS[config.preset] || PRESETS[DEFAULT_PRESET];
}

function getColor(key) {
  const theme = getTheme();
  return theme[key] ?? PRESETS[DEFAULT_PRESET][key] ?? 0x00d4ff;
}

function createColorProxy() {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'toJSON') return undefined;
      if (prop === 'keys') return () => COLOR_KEYS;
      return getColor(prop);
    },
    ownKeys() {
      return COLOR_KEYS;
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (COLOR_KEYS.includes(prop)) return { enumerable: true, configurable: true };
      return undefined;
    }
  });
}

function setThemePreset(preset) {
  const key = String(preset || '').toLowerCase();
  if (!PRESETS[key]) {
    throw new Error(`Unknown theme preset. Use one of: ${Object.keys(PRESETS).join(', ')}, custom.`);
  }

  return store.update(data => {
    data.theme = { preset: key, custom: data.theme?.custom || null };
  });
}

function setCustomTheme({ primary, secondary, accent, name = 'Custom Theme' }) {
  const custom = {
    name,
    primary: hexToInt(primary, 'primary'),
    secondary: hexToInt(secondary, 'secondary'),
    accent: hexToInt(accent, 'accent')
  };

  return store.update(data => {
    data.theme = { preset: 'custom', custom };
  });
}

function resetTheme() {
  return store.update(data => {
    data.theme = { preset: DEFAULT_PRESET, custom: null };
  });
}

function themeSummary(theme = getTheme()) {
  return {
    Name: theme.label,
    Primary: intToHex(theme.frost),
    Secondary: intToHex(theme.orange),
    Accent: intToHex(theme.sky),
    Footer: theme.footer
  };
}

function listPresets() {
  return Object.values(PRESETS).map(theme => ({
    id: theme.id,
    label: theme.label,
    description: theme.description,
    primary: intToHex(theme.frost),
    secondary: intToHex(theme.orange),
    accent: intToHex(theme.sky)
  }));
}

module.exports = {
  PRESETS,
  DEFAULT_PRESET,
  COLOR_KEYS,
  hexToInt,
  intToHex,
  getThemeConfig,
  getTheme,
  getColor,
  createColorProxy,
  setThemePreset,
  setCustomTheme,
  resetTheme,
  themeSummary,
  listPresets
};
