/**
 * GCM Authentication Controller
 */
const { query } = require('../../../database');
const { log } = require('../utils/logger');

const login = async (req, res) => {
    const { email, password } = req.body;
    log(`[Auth] Login attempt: ${email}`);
    try {
        const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length > 0) {
            const u = rows[0];
            // PLAIN TEXT MATCH (requested for debugging)
            const match = (password === u.password);

            if (match) {
                log(`[Auth] Login success: ${email}`);
                const safe = { ...u };
                delete safe.password;
                return res.json(safe);
            }
        }
        log(`[Auth] Login failed (401): ${email}`);
        res.status(401).json({ error: 'Auth Failed' });
    } catch (e) {
        log(`[Auth Error] Login failed for ${email}: ${e.message}`);
        res.status(500).json({ error: e.message, details: 'Check server_error.log for details' });
    }
};

module.exports = {
    login
};
