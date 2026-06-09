const http = require('http');

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return fallback;
};

const createWorkerHealthServer = ({ workerName, portEnvVar, defaultPort, log }) => {
    const port = parsePort(process.env[portEnvVar], defaultPort);
    const startedAt = new Date().toISOString();
    let ready = false;
    let lastError = null;

    const server = http.createServer((req, res) => {
        if (req.url !== '/healthz' && req.url !== '/readyz') {
            res.statusCode = 404;
            res.end('Not Found');
            return;
        }

        const body = JSON.stringify({
            worker: workerName,
            ready,
            startedAt,
            lastError,
        });

        res.statusCode = req.url === '/readyz' && !ready ? 503 : 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(body);
    });

    server.listen(port, () => {
        log(`[${workerName}] Health server listening on port ${port}`);
    });

    const markReady = () => {
        ready = true;
        lastError = null;
    };

    const markNotReady = (error) => {
        ready = false;
        lastError = error ? String(error) : null;
    };

    const close = () => {
        server.close();
    };

    return {
        markReady,
        markNotReady,
        close,
    };
};

module.exports = {
    createWorkerHealthServer,
};
