/**
 * GCM Backend Logger
 * [log]
 */
const fs = require('fs');
const path = require('path');

// Log file in the backend root
const LOG_FILE = path.join(__dirname, '..', '..', 'server_error.log');

const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        fs.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        // Silently fail if log cannot be written (usually permission issues)
    }
    console.log(entry);
};

module.exports = {
    log,
    LOG_FILE
};
