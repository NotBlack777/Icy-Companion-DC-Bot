/**
 * The @bot help command panel (or /dm-help on an enabled private control bot).
 *
 * This uses the same calm, paged layout as the server help menu: a small
 * overview page, one category per page, and compact controls underneath.
 * Keeping one category on screen at a time makes the panel much easier to
 * read on a phone than one giant embed full of code blocks and box drawing.
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const registry = require('./registry');
const loadDmCommands = require('./loadCommands');
const ui = require('./ui');
const store = require('../utils/globalStore');
const { e } = require('../utils/uiHelper');

const { ICY } = ui;

function icon(name, fallback) {
  return e(name) || fallback;
}

const HOME_ID = 'home';
const DM_HELP_PREFIX = 'dm_help_';

// Keep the DM panel's controls separate from the server help controls. This
// lets both menus live in the same DM/server interaction handler safely.
const DM_HELP_IDS = {
  first: `${DM_HELP_PREFIX}first`,
  previous: `${DM_HELP_PREFIX}previous`,
  home: `${DM_HELP_PREFIX}home`,
  next: `${DM_HELP_PREFIX}next`,
  last: `${DM_HELP_PREFIX}last`,
  select: `${DM_HELP_PREFIX}select`
};

const GROUP_COLORS = {
  info:       ICY.frost,
  delete:     ICY.lava,
  broadcast:  ICY.mint,
  management: ICY.violet,
  reports:    ICY.amber,
  staff:      ICY.amber,
  dmlogger:   ICY.neon,
  privacy:    ICY.brand,
  security:   ICY.error,
  moderation: ICY.pink
};

// These keys match the emoji names accepted by /store-emoji. When a custom
// value is stored, the DM panel picks it up automatically; the fallback keeps
// the panel fully usable with regular Unicode emoji.
const GROUP_EMOJI_KEYS = {
  info: 'commands',
  delete: 'delete',
  broadcast: 'broadcast',
  management: 'settings',
  reports: 'chart',
  staff: 'staff',
  dmlogger: 'dmlogger',
  privacy: 'privacy',
  security: 'security',
  moderation: 'moderation'
};

const FALLBACK_GROUP_EMOJIS = {
  info: '📋',
  delete: '🗑️',
  broadcast: '📢',
  management: '⚙️',
  reports: '📊',
  staff: '⭐',
  dmlogger: '📨',
  privacy: '🔒',
  security: '🛡️',
  moderation: '⚠️'
};

const LOCKED_BADGE = '🔒';
const READY_BADGE = '🔓';

// ─── Visible groups for a user ─────────────────────────────────────
function visibleGroups(userId) {
  loadDmCommands();

  return registry.GROUPS
    .map(group => ({
      ...group,
      emoji: icon(
        GROUP_EMOJI_KEYS[group.id],
        group.emoji || FALLBACK_GROUP_EMOJIS[group.id] || '📁'
      ),
      commands: registry
        .byGroup(group.id)
        .filter(command => store.hasTier(userId, command.tier))
    }))
    .filter(group => group.commands.length);
}

/**
 * Build the pages available to this user. The home page is always first;
 * the remaining pages are derived from the command registry so a new DM
 * command automatically appears in the menu.
 */
function helpCategories(userId) {
  const groups = visibleGroups(userId);

  return [
    {
      id: HOME_ID,
      label: 'Home',
      emoji: icon('home', '🏠'),
      color: ICY.frost,
      description: 'A quick overview of your DM command hub',
      commands: []
    },
    ...groups.map(group => ({
      id: group.id,
      label: group.label,
      emoji: group.emoji,
      color: GROUP_COLORS[group.id] || ICY.frost,
      description: groupDescription(group),
      commands: group.commands
    }))
  ];
}

function groupDescription(group) {
  const descriptions = {
    info: 'Servers, status, configuration and quick lookups.',
    delete: 'Remove messages cleanly from servers or DMs.',
    broadcast: 'Send announcements and messages from one place.',
    management: 'Manage servers, owners, attendance settings and UI themes.',
    reports: 'Attendance reminders and useful reports.',
    staff: 'Add, remove and review staff across your servers.',
    dmlogger: 'Control where incoming DMs are logged.',
    privacy: 'Keep the bot quiet, private or ready to restart.',
    security: 'Passwords, owners, sessions and two-factor security.',
    moderation: 'Roles, timeouts, warnings and voice tools.'
  };

  return descriptions[group.id] || `${group.label} commands for your bot.`;
}

function totalCommands(categories) {
  return categories
    .filter(category => category.id !== HOME_ID)
    .reduce((total, category) => total + category.commands.length, 0);
}

function tierLabel(userId) {
  if (store.isSuperOwner(userId)) return 'Super Owner';
  if (store.isGlobalOwner(userId)) return 'Global Owner';
  return 'Junior Owner';
}

function avatarUrl(ctx) {
  return ctx.client?.user?.displayAvatarURL?.() || undefined;
}

function clampPage(page, categories) {
  const lastPage = Math.max(0, categories.length - 1);
  const numeric = Number(page);

  if (!Number.isInteger(numeric)) return 0;
  return Math.min(Math.max(numeric, 0), lastPage);
}

// ─── Mobile-friendly command rows ──────────────────────────────────
/**
 * Split the command name from its arguments. A separate argument segment
 * wraps much more naturally on narrow screens than a long code block.
 */
function usageParts(command) {
  const usage = String(command.usage || `@bot ${command.name}`);
  const commandText = `@bot ${command.name}`;

  if (usage.toLowerCase().startsWith(commandText.toLowerCase())) {
    return {
      command: commandText,
      args: usage.slice(commandText.length).trim()
    };
  }

  return { command: usage, args: '' };
}

function commandBadge(command, locked) {
  if (command.secure) return locked ? icon('locked', LOCKED_BADGE) : icon('security', '🛡️');
  if (command.tier === 'owner') return icon('premium', '⭐');
  if (command.tier === 'junior') return icon('info', '🔹');
  return icon('sparkles', '✨');
}

function commandRow(command, locked) {
  const { command: name, args } = usageParts(command);
  const suffix = args ? ` ${args}` : '';
  return `${commandBadge(command, locked)} **${name}**${suffix}\n> ${command.desc}`;
}

// ─── Embed pages ───────────────────────────────────────────────────
function embedBase(ctx, color) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: '🌅 Icy Companion • DM Command Matrix',
      iconURL: avatarUrl(ctx)
    })
    .setTimestamp();

  const avatar = avatarUrl(ctx);
  if (avatar) embed.setThumbnail(avatar);

  return embed;
}

function buildHomePage(ctx, categories, page) {
  const locked = store.isLocked() && !store.isSessionUnlocked(ctx.user.id);
  const groups = categories.slice(1);
  const total = totalCommands(categories);
  const badge = locked ? icon('locked', LOCKED_BADGE) : icon('unlocked', READY_BADGE);
  const status = locked ? 'Locked actions need an unlock first.' : 'Your command hub is ready.';
  const statusIcon = locked ? icon('locked', LOCKED_BADGE) : icon('success', '✅');
  const ice = icon('ice', '🧊');
  const home = icon('home', '🏠');

  const categoryLines = groups.length
    ? groups.map(group =>
      `${group.emoji} **${group.label}** — ${group.commands.length} command${group.commands.length === 1 ? '' : 's'}`
    )
    : [`${icon('sleep', '💤')} No commands are available for this account yet.`];

  return embedBase(ctx, locked ? ICY.lava : ICY.frost)
    .setDescription([
      `### 🌅 ${icon('ice', '🧊')} Sunset Ice DM Hub`,
      '> Owner controls with the orange-sky × icy-blue Icy Companion accent.',
      ui.DIVIDER,
      `${badge} **${tierLabel(ctx.user.id)}**`,
      `> ${statusIcon} ${status}`,
      '',
      `${icon('chart', '📊')} **At a glance**`,
      `> ${ice} **${total}** command${total === 1 ? '' : 's'}  •  ${icon('folder', '🗂️')} **${groups.length}** section${groups.length === 1 ? '' : 's'}`,
      '',
      `${icon('compass', '🧭')} **Command Sections**`,
      ...categoryLines,
      ui.THIN_DIV,
      `${icon('bulb', '💡')} **Quick tips**`,
      '> Use `#1` for a server config number, or paste the full server ID.',
      '> Use `@bot <command>` here; slash access is kept off this bot by default.',
      locked ? `> Unlock with \`@bot unlock <password>\` or a TOTP code.` : `> Choose a section below and tap ${home} to return here.`
    ].join('\n'))
    .setFooter({ text: `Page ${page + 1}/${categories.length} • ${total} commands • Sunset Ice DM control` });
}

function buildCategoryPage(ctx, category, categories, page) {
  const locked = store.isLocked() && !store.isSessionUnlocked(ctx.user.id);
  const rows = category.commands.map(command => commandRow(command, locked));
  const state = locked
    ? `• ${icon('locked', LOCKED_BADGE)} Secured actions are locked`
    : `• ${icon('ice', '🌊')} Ready when you are`;

  return embedBase(ctx, category.color || ICY.frost)
    .setDescription([
      `### ${category.emoji} ${category.label} Matrix`,
      `> ${category.description}`,
      ui.DIVIDER,
      `**${category.commands.length} command${category.commands.length === 1 ? '' : 's'}**  ${state}`,
      '',
      rows.length ? rows.join('\n\n') : `${icon('sleep', '💤')} Nothing is available in this section yet.`,
      ui.THIN_DIV,
      `${icon('chat', '💬')} Use the exact format shown above. Tap ${icon('home', '🏠')} for the overview.`
    ].join('\n'))
    .setFooter({
      text: `Page ${page + 1}/${categories.length} • ${category.commands.length} commands • Sunset Ice DM matrix`
    });
}

function buildDmHelpEmbed(ctx, page = 0, categories = helpCategories(ctx.user.id)) {
  const currentPage = clampPage(page, categories);
  const category = categories[currentPage];

  if (category.id === HOME_ID) {
    return buildHomePage(ctx, categories, currentPage);
  }

  return buildCategoryPage(ctx, category, categories, currentPage);
}

// ─── Mobile-friendly controls ──────────────────────────────────────
function buildDmHelpComponents(page, categories) {
  const currentPage = clampPage(page, categories);
  const lastPage = categories.length - 1;

  const navigationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(DM_HELP_IDS.first)
      .setEmoji(icon('first', '⏮️'))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(DM_HELP_IDS.previous)
      .setEmoji(icon('previous', '◀️'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(DM_HELP_IDS.home)
      .setEmoji(icon('home', '🏠'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(DM_HELP_IDS.next)
      .setEmoji(icon('next', '▶️'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === lastPage),
    new ButtonBuilder()
      .setCustomId(DM_HELP_IDS.last)
      .setEmoji(icon('last', '⏭️'))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === lastPage)
  );

  const selectMenuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(DM_HELP_IDS.select)
      .setPlaceholder(`${icon('compass', '🧭')} ${categories[currentPage].label} • Choose a section`)
      .addOptions(
        categories.map((category, index) => ({
          label: category.label,
          value: String(index),
          emoji: category.emoji,
          description: category.description.slice(0, 100),
          default: index === currentPage
        }))
      )
  );

  return [navigationRow, selectMenuRow];
}

/**
 * Build the message payload used by both the mention command and /dm-help.
 */
function buildDmHelp(ctx, page = 0) {
  const categories = helpCategories(ctx.user.id);
  const currentPage = clampPage(page, categories);

  return {
    embeds: [buildDmHelpEmbed(ctx, currentPage, categories)],
    components: buildDmHelpComponents(currentPage, categories)
  };
}

function pageFromMessage(interaction) {
  const footer = interaction.message?.embeds?.[0]?.footer?.text || '';
  const match = footer.match(/Page\s+(\d+)\s*\//i);
  return match ? Number(match[1]) - 1 : 0;
}

module.exports = {
  HOME_ID,
  DM_HELP_PREFIX,
  DM_HELP_IDS,
  GROUP_COLORS,
  visibleGroups,
  helpCategories,
  totalCommands,
  clampPage,
  usageParts,
  commandRow,
  buildDmHelpEmbed,
  buildDmHelpComponents,
  buildDmHelp,
  pageFromMessage
};
