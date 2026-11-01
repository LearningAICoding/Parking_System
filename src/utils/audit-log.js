function auditLog(event, details = {}) {
  process.stdout.write(`${JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...details })}\n`);
}

module.exports = auditLog;
