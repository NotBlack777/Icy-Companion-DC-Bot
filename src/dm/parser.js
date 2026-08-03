/**
 * Mention command parser
 * ----------------------
 * Turns a raw message like
 *
 *   @Icy Companion kick #1 123456789 being rude
 *
 * into { name: 'kick', args: { server: '#1', user: '123456789', reason: 'being rude' } }
 *
 * Argument types:
 *   server  -> "#N" or a guild ID
 *   user    -> raw ID or <@mention>
 *   channel -> raw ID or <#mention>
 *   int     -> integer
 *   word    -> single token
 *   rest    -> everything remaining (always last)
 */

const MENTION_PATTERN = /^<@!?(\d+)>/;

/**
 * Strip a leading bot mention. Returns null when the message is not
 * addressed to the bot.
 */
function stripMention(content, botId) {
  const trimmed = String(content || '').trim();
  const match = trimmed.match(MENTION_PATTERN);

  if (!match) return null;
  if (match[1] !== botId) return null;

  return trimmed.slice(match[0].length).trim();
}

function tokenize(input) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;

  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
}

function cleanId(token) {
  if (token === undefined || token === null) return null;
  const match = String(token).match(/\d{15,25}/);
  return match ? match[0] : String(token);
}

/**
 * Match the longest command phrase, so multi-word commands like
 * "turn on privacy mode" and "report weekly" resolve correctly.
 */
function matchCommand(tokens, registry) {
  for (let length = Math.min(4, tokens.length); length >= 1; length--) {
    const phrase = tokens.slice(0, length).join(' ').toLowerCase();
    const command = registry.get(phrase);

    if (command) {
      return { command, rest: tokens.slice(length) };
    }
  }

  return { command: null, rest: tokens };
}

/**
 * Bind positional tokens to the command's declared args.
 */
function bindArgs(spec, tokens) {
  const args = {};
  const errors = [];
  let index = 0;

  for (const arg of spec) {
    const isLast = arg === spec[spec.length - 1];

    if (arg.type === 'rest') {
      const value = tokens.slice(index).join(' ').trim();

      if (!value && arg.required) {
        errors.push(`Missing \`${arg.name}\`.`);
      }

      args[arg.name] = value || arg.default || null;
      index = tokens.length;
      continue;
    }

    const token = tokens[index];

    if (token === undefined) {
      if (arg.required) errors.push(`Missing \`${arg.name}\`.`);
      args[arg.name] = arg.default ?? null;
      continue;
    }

    switch (arg.type) {
      case 'user':
      case 'channel':
        args[arg.name] = cleanId(token);
        break;

      case 'int': {
        const num = Number(token);

        if (!Number.isFinite(num)) {
          errors.push(`\`${arg.name}\` must be a number (got \`${token}\`).`);
          args[arg.name] = arg.default ?? null;
        } else {
          args[arg.name] = num;
        }
        break;
      }

      case 'server':
      case 'word':
      default:
        args[arg.name] = token;
        break;
    }

    index++;

    // Absorb trailing tokens into the final word arg when there is no
    // explicit rest arg, so quoting is optional for things like reasons.
    if (isLast && arg.type === 'word' && index < tokens.length && !spec.some(a => a.type === 'rest')) {
      args[arg.name] = [args[arg.name], ...tokens.slice(index)].join(' ');
      index = tokens.length;
    }
  }

  return { args, errors };
}

/**
 * Full parse of a mention message.
 */
function parse(content, botId, registry) {
  const stripped = stripMention(content, botId);
  if (stripped === null) return { addressed: false };

  if (!stripped) {
    return { addressed: true, command: null, empty: true };
  }

  const tokens = tokenize(stripped);
  const { command, rest } = matchCommand(tokens, registry);

  if (!command) {
    return { addressed: true, command: null, unknown: tokens[0] };
  }

  const { args, errors } = bindArgs(command.args || [], rest);

  return { addressed: true, command, args, errors, raw: rest.join(' ') };
}

module.exports = { parse, stripMention, tokenize, cleanId, bindArgs, matchCommand };
