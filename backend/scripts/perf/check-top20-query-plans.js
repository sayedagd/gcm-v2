#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TOP_N = parsePositiveInt(process.env.PERF_TOP_QUERY_COUNT, 20);
const OUTPUT_PATH = process.env.PERF_QUERY_PLAN_OUTPUT || path.resolve(process.cwd(), 'docs', 'query-plan-top20.md');
const EXPECT_EXTENSION = process.env.PERF_REQUIRE_PG_STAT_STATEMENTS !== 'false';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
});

const isLikelySafeForExplain = (sqlText) => {
    const normalized = String(sqlText || '').trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.includes('$1')) return false;
    return normalized.startsWith('select ');
};

const buildSummaryTable = (rows) => {
    const lines = [
        '| Rank | Query ID | Calls | Mean ms | Total ms | Rows |',
        '| --- | --- | ---: | ---: | ---: | ---: |',
    ];

    rows.forEach((row, index) => {
        lines.push(
            `| ${index + 1} | ${row.queryid || 'n/a'} | ${row.calls} | ${Number(row.mean_ms).toFixed(2)} | ${Number(row.total_ms).toFixed(2)} | ${row.rows} |`
        );
    });

    return lines.join('\n');
};

const buildDetailSection = (rows) => {
    return rows
        .map((row, index) => {
            const explainBlock = row.explainPlan
                ? `\n\nExplain Plan:\n\n\`\`\`\n${row.explainPlan}\n\`\`\``
                : '\n\nExplain Plan: skipped (parameterized or non-SELECT query).';

            return [
                `## Query ${index + 1}`,
                `- Query ID: ${row.queryid || 'n/a'}`,
                `- Calls: ${row.calls}`,
                `- Mean execution ms: ${Number(row.mean_ms).toFixed(2)}`,
                `- Total execution ms: ${Number(row.total_ms).toFixed(2)}`,
                `- Rows: ${row.rows}`,
                '',
                'SQL:',
                '',
                '```sql',
                String(row.query || '').trim(),
                '```',
                explainBlock,
            ].join('\n');
        })
        .join('\n\n');
};

const queryStats = async (client, hasTotalExecTime, hasMeanExecTime) => {
    const totalColumn = hasTotalExecTime ? 'total_exec_time' : 'total_time';
    const meanColumn = hasMeanExecTime ? 'mean_exec_time' : `(${totalColumn} / NULLIF(calls, 0))`;

    const sql = `
        SELECT
            queryid,
            query,
            calls,
            ${meanColumn} AS mean_ms,
            ${totalColumn} AS total_ms,
            rows
        FROM pg_stat_statements
        WHERE calls > 0
        ORDER BY ${totalColumn} DESC
        LIMIT $1
    `;

    const result = await client.query(sql, [TOP_N]);
    return result.rows;
};

const readColumnSupport = async (client) => {
    const extensionResult = await client.query("SELECT to_regclass('public.pg_stat_statements') AS regclass");
    const extensionAvailable = Boolean(extensionResult.rows[0] && extensionResult.rows[0].regclass);

    if (!extensionAvailable) {
        if (EXPECT_EXTENSION) {
            throw new Error('pg_stat_statements is not available. Enable extension or set PERF_REQUIRE_PG_STAT_STATEMENTS=false.');
        }
        return { extensionAvailable: false, hasTotalExecTime: false, hasMeanExecTime: false };
    }

    const columnResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pg_stat_statements'
    `);

    const columns = new Set(columnResult.rows.map((row) => row.column_name));
    return {
        extensionAvailable: true,
        hasTotalExecTime: columns.has('total_exec_time'),
        hasMeanExecTime: columns.has('mean_exec_time'),
    };
};

const attachExplainPlans = async (client, rows) => {
    for (const row of rows) {
        if (!isLikelySafeForExplain(row.query)) {
            row.explainPlan = null;
            continue;
        }

        try {
            const explainResult = await client.query(`EXPLAIN ${row.query}`);
            row.explainPlan = explainResult.rows.map((item) => item['QUERY PLAN']).join('\n');
        } catch (error) {
            row.explainPlan = `EXPLAIN failed: ${error.message}`;
        }
    }

    return rows;
};

const writeReport = async (rows) => {
    const report = [
        '# Top 20 Query Plan Review',
        '',
        `- Generated at: ${new Date().toISOString()}`,
        `- Source: pg_stat_statements`,
        `- Query count: ${rows.length}`,
        '',
        '## Summary',
        '',
        buildSummaryTable(rows),
        '',
        '## Query Details',
        '',
        buildDetailSection(rows),
    ].join('\n');

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, report, 'utf8');
};

const main = async () => {
    const client = await pool.connect();

    try {
        const support = await readColumnSupport(client);
        if (!support.extensionAvailable) {
            console.log('[perf] pg_stat_statements not available and extension requirement disabled. Nothing to report.');
            return;
        }

        const rows = await queryStats(client, support.hasTotalExecTime, support.hasMeanExecTime);
        await attachExplainPlans(client, rows);
        await writeReport(rows);

        console.log(`[perf] Query plan report generated: ${OUTPUT_PATH}`);
    } finally {
        client.release();
        await pool.end();
    }
};

main().catch((error) => {
    console.error(`[perf] Query plan check failed: ${error.message}`);
    process.exit(1);
});
