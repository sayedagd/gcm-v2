/**
 * GCM Backend Logger
 * [log]
 */
const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');

// Log file in the backend root
const LOG_FILE = path.join(__dirname, '..', '..', 'server_error.log');
const logContextStorage = new AsyncLocalStorage();

const getLogContext = () => logContextStorage.getStore() || {};

const runWithLogContext = (context, handler) => logContextStorage.run(context || {}, handler);

const writeLogLine = (payload) => {
    const line = `${JSON.stringify(payload)}\n`;

    try {
        fs.appendFileSync(LOG_FILE, line);
    } catch (e) {
        // Silently fail if log cannot be written (usually permission issues)
    }

    console.log(line.trim());
};

const log = (msg, data = {}) => {
    const context = getLogContext();

    writeLogLine({
        ts: new Date().toISOString(),
        level: 'info',
        message: msg,
        correlationId: context.correlationId || null,
        ...data,
    });
};

const logEvent = (event, data = {}) => {
    const context = getLogContext();
    const payload = {
        ts: new Date().toISOString(),
        event,
        correlationId: data.correlationId || context.correlationId || null,
        ...data,
    };

    writeLogLine(payload);
};

module.exports = {
    log,
    logEvent,
    runWithLogContext,
    getLogContext,
    LOG_FILE
};
