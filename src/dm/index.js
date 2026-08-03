/**
 * DM subsystem entry point.
 *
 * Importing this file registers every DM command in the registry.
 * Keep the order stable - it drives the order of the help panel.
 */

require('./commands/info');
require('./commands/deletion');
require('./commands/broadcast');
require('./commands/management');
require('./commands/reports');
require('./commands/dmlogger');
require('./commands/privacy');
require('./commands/security');

const registry = require('./registry');
const executor = require('./executor');
const parser = require('./parser');
const logger = require('./logger');
const help = require('./help');

module.exports = {
  registry,
  executor,
  parser,
  logger,
  help,
  GROUPS: registry.GROUPS,
  commands: registry.all()
};
