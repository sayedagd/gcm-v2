const warnedKeys = new Set();

const warnOnce = (key, message) => {
    if (warnedKeys.has(key)) {
        return;
    }

    warnedKeys.add(key);
    console.warn(message);
};

const getJwtSecret = () => {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }

    warnOnce('jwt-secret-missing', '[GCM] JWT_SECRET is not set. Auth is disabled until JWT_SECRET is configured.');
    return null;
};

module.exports = {
    getJwtSecret,
};