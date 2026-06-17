const { Pool } = require('pg');
const iconv = require('iconv-lite');
const path = require('path');
const fs = require('fs');

const findEnv = () => {
    const candidates = [
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'backend', '.env'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return null;
};

const envPath = findEnv();
if (envPath) {
    require('dotenv').config({ path: envPath });
}

const parseArgs = () => {
    const args = process.argv.slice(2);
    const parsed = {
        apply: false,
        tables: null,
        limit: null,
        verbose: false,
    };

    for (const arg of args) {
        if (arg === '--apply') parsed.apply = true;
        else if (arg === '--dry-run') parsed.apply = false;
        else if (arg === '--verbose') parsed.verbose = true;
        else if (arg.startsWith('--tables=')) {
            parsed.tables = arg.replace('--tables=', '').split(',').map((v) => v.trim()).filter(Boolean);
        } else if (arg.startsWith('--limit=')) {
            const n = Number.parseInt(arg.replace('--limit=', ''), 10);
            if (Number.isFinite(n) && n > 0) parsed.limit = n;
        }
    }

    return parsed;
};

const options = parseArgs();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const poolConfig = connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
    }
    : {
        user: process.env.POSTGRES_USER || process.env.PROD_DB_USER || 'postgres',
        host: process.env.POSTGRES_HOST || process.env.PROD_DB_HOST || 'localhost',
        database: process.env.POSTGRES_DB || process.env.PROD_DB_NAME || 'gcm_waste',
        password: process.env.POSTGRES_PASSWORD || process.env.PROD_DB_PASS || '123',
        port: Number.parseInt(process.env.POSTGRES_PORT || process.env.PROD_DB_PORT || '5432', 10),
    };

const pool = new Pool(poolConfig);

const ARABIC_RE = /[\u0600-\u06FF]/g;
const MOJIBAKE_RE = /(Ø|Ù|Ã|Â|ظ.|ط.)/;

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const countMatches = (value, re) => {
    const m = String(value).match(re);
    return m ? m.length : 0;
};

const scoreCandidate = (value) => {
    const s = String(value);
    const arabicCount = countMatches(s, ARABIC_RE);
    const mojibakeCount = countMatches(s, /(Ø|Ù|Ã|Â|ظ|ط|�)/g);
    return (arabicCount * 3) - (mojibakeCount * 2);
};

const decodeLatin1 = (value) => {
    try {
        return Buffer.from(String(value), 'latin1').toString('utf8');
    } catch {
        return String(value);
    }
};

const decodeWin1256 = (value) => {
    try {
        const bytes = iconv.encode(String(value), 'win1256');
        return bytes.toString('utf8');
    } catch {
        return String(value);
    }
};

const fixString = (value) => {
    if (typeof value !== 'string') return { changed: false, value };
    const original = value;

    if (!MOJIBAKE_RE.test(original)) {
        return { changed: false, value: original };
    }

    const candidates = [original, decodeLatin1(original), decodeWin1256(original)];
    let best = original;
    let bestScore = scoreCandidate(original);

    for (const candidate of candidates) {
        const score = scoreCandidate(candidate);
        if (score > bestScore) {
            best = candidate;
            bestScore = score;
        }
    }

    const changed = best !== original;
    return { changed, value: best };
};

const fixJsonLike = (value) => {
    if (value == null) return { changed: false, value };

    const walk = (node) => {
        if (typeof node === 'string') {
            return fixString(node);
        }

        if (Array.isArray(node)) {
            let changed = false;
            const arr = node.map((item) => {
                const next = walk(item);
                changed = changed || next.changed;
                return next.value;
            });
            return { changed, value: arr };
        }

        if (node && typeof node === 'object') {
            let changed = false;
            const out = {};
            for (const [k, v] of Object.entries(node)) {
                const next = walk(v);
                changed = changed || next.changed;
                out[k] = next.value;
            }
            return { changed, value: out };
        }

        return { changed: false, value: node };
    };

    return walk(value);
};

const getTargetColumns = async (client) => {
    const res = await client.query(
        `
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')
        ORDER BY table_name, ordinal_position
        `,
    );

    const grouped = new Map();
    for (const row of res.rows) {
        if (options.tables && !options.tables.includes(row.table_name)) continue;
        if (!grouped.has(row.table_name)) grouped.set(row.table_name, []);
        grouped.get(row.table_name).push({
            column: row.column_name,
            type: row.data_type,
        });
    }

    return grouped;
};

const getPrimaryKeys = async (client, tableName) => {
    const res = await client.query(
        `
        SELECT a.attname AS column_name
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass
          AND i.indisprimary = true
        ORDER BY array_position(i.indkey, a.attnum)
        `,
        [tableName],
    );
    return res.rows.map((r) => r.column_name);
};

const run = async () => {
    const client = await pool.connect();
    let totalRowsScanned = 0;
    let totalRowsChanged = 0;
    let totalCellsChanged = 0;
    let totalRowsSkipped = 0;

    try {
        console.log('--- Arabic Mojibake Repair Tool ---');
        console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}`);
        if (options.tables) console.log(`Tables filter: ${options.tables.join(', ')}`);
        if (options.limit) console.log(`Row limit per table: ${options.limit}`);

        const tables = await getTargetColumns(client);
        if (tables.size === 0) {
            console.log('No matching tables/columns found.');
            return;
        }

        for (const [tableName, columns] of tables.entries()) {
            const pkCols = await getPrimaryKeys(client, tableName);
            const pkSelect = pkCols.length > 0 ? pkCols.map((c) => quoteIdent(c)).join(', ') : 'ctid::text AS __ctid';
            const colSelect = columns.map((c) => quoteIdent(c.column)).join(', ');
            const limitClause = options.limit ? ` LIMIT ${options.limit}` : '';

            const selectSql = `SELECT ${pkSelect}, ${colSelect} FROM ${quoteIdent(tableName)}${limitClause}`;
            const rowsRes = await client.query(selectSql);
            const rows = rowsRes.rows;

            let tableRowsChanged = 0;
            let tableCellsChanged = 0;
            let tableRowsSkipped = 0;
            let tableRowsProcessed = 0;
            totalRowsScanned += rows.length;

            if (options.apply) {
                await client.query('BEGIN');
                // Avoid indefinite waits on hot tables while app traffic is active.
                await client.query("SET LOCAL lock_timeout = '1000ms'");
                await client.query("SET LOCAL statement_timeout = '30000ms'");
            }

            for (const row of rows) {
                tableRowsProcessed += 1;
                if (options.apply && tableRowsProcessed % 100 === 0) {
                    console.log(`${tableName}: processed ${tableRowsProcessed}/${rows.length}`);
                }

                const sets = [];
                const values = [];
                let changedCellsInRow = 0;

                for (const c of columns) {
                    const raw = row[c.column];
                    if (raw == null) continue;

                    let fixed;
                    if (c.type === 'json' || c.type === 'jsonb') {
                        const next = fixJsonLike(raw);
                        if (!next.changed) continue;
                        fixed = next.value;
                    } else if (c.column.endsWith('_page') || c.column.includes('config') || c.column.includes('template')) {
                        // Some JSON payloads are stored in text columns.
                        if (typeof raw === 'string') {
                            try {
                                const parsed = JSON.parse(raw);
                                const next = fixJsonLike(parsed);
                                if (!next.changed) continue;
                                fixed = JSON.stringify(next.value);
                            } catch {
                                const next = fixString(raw);
                                if (!next.changed) continue;
                                fixed = next.value;
                            }
                        } else {
                            continue;
                        }
                    } else {
                        const next = fixString(raw);
                        if (!next.changed) continue;
                        fixed = next.value;
                    }

                    changedCellsInRow += 1;
                    values.push(fixed);
                    const valueIndex = values.length;
                    sets.push(`${quoteIdent(c.column)} = $${valueIndex}`);
                }

                if (changedCellsInRow === 0) continue;

                tableRowsChanged += 1;
                tableCellsChanged += changedCellsInRow;

                if (options.apply) {
                    let whereClause;
                    if (pkCols.length > 0) {
                        const conds = pkCols.map((pk) => {
                            values.push(row[pk]);
                            return `${quoteIdent(pk)} = $${values.length}`;
                        });
                        whereClause = conds.join(' AND ');
                    } else {
                        values.push(row.__ctid);
                        whereClause = `ctid::text = $${values.length}`;
                    }

                    const updateSql = `UPDATE ${quoteIdent(tableName)} SET ${sets.join(', ')} WHERE ${whereClause}`;
                    try {
                        await client.query(updateSql, values);
                    } catch (error) {
                        const lockOrTimeout = error && (error.code === '55P03' || error.code === '57014');
                        if (lockOrTimeout) {
                            tableRowsChanged -= 1;
                            tableCellsChanged -= changedCellsInRow;
                            tableRowsSkipped += 1;
                            continue;
                        }
                        throw error;
                    }
                } else if (options.verbose && tableRowsChanged <= 5) {
                    console.log(`[DRY] ${tableName}: row candidate with ${changedCellsInRow} fixed cell(s)`);
                }
            }

            if (options.apply) await client.query('COMMIT');

            totalRowsChanged += tableRowsChanged;
            totalCellsChanged += tableCellsChanged;
            totalRowsSkipped += tableRowsSkipped;

            if (tableRowsChanged > 0) {
                console.log(`${tableName}: rows changed=${tableRowsChanged}, cells changed=${tableCellsChanged}`);
            } else if (options.verbose) {
                console.log(`${tableName}: no changes needed`);
            }
            if (tableRowsSkipped > 0) {
                console.log(`${tableName}: rows skipped due to lock/timeout=${tableRowsSkipped}`);
            }
        }

        console.log('--- Summary ---');
        console.log(`Rows scanned: ${totalRowsScanned}`);
        console.log(`Rows changed: ${totalRowsChanged}`);
        console.log(`Cells changed: ${totalCellsChanged}`);
        console.log(`Rows skipped (lock/timeout): ${totalRowsSkipped}`);
    } catch (error) {
        if (options.apply) {
            try { await client.query('ROLLBACK'); } catch (_) {}
        }
        console.error('Repair failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
};

run();
