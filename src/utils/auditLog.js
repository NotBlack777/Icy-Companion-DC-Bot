const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../../server_configs');
const auditPath = path.join(baseDir, 'audit.json');
const MAX_ENTRIES = 500;

function ensureDir() {
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
}

function readAudit() {
  ensureDir();
  try {
    if (!fs.existsSync(auditPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAudit(entries) {
  ensureDir();
  fs.writeFileSync(auditPath, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2));
}

function recordAudit(entry) {
  const entries = readAudit();
  entries.push({
    id: Date.now().toString(36),
    at: new Date().toISOString(),
    ...entry
  });
  writeAudit(entries);
}

function listAudit(limit = 20) {
  return readAudit().slice(-Math.max(1, Math.min(Number(limit) || 20, 100))).reverse();
}

module.exports = { auditPath, recordAudit, listAudit };
