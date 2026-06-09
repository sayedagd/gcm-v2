/**
 * GCM Projects Controller (Micro-Module)
 */
const { sql } = require('drizzle-orm');
const { db } = require('../../../shared/db/drizzle/client');
const { upsert, deleteProject } = require('../../../shared/controllers/crudController');
const { log, logEvent } = require('../../../shared/utils/logger');
const { serverError } = require('../../../shared/utils/bilingualErrors');

const list = async (req, res) => {
    const startedAt = Date.now();
    try {
        const result = await db.execute(sql`
            SELECT
                p.*,
                COALESCE(
                    (SELECT json_agg(service_id) FROM project_services ps WHERE ps.project_id = p.project_id),
                    '[]'::json
                ) AS service_ids
            FROM projects p
            WHERE p.details != 'ARCHIVED' OR p.details IS NULL
            ORDER BY p.project_id
        `);

        const rows = result.rows || [];
        const decorated = rows.map((project) => ({
            ...project,
            service_ids: project.service_ids || [],
            assets: {
                large_containers: project.assets_large_containers,
                small_containers: project.assets_small_containers,
                compactors: project.assets_compactors,
                other_assets: project.assets_other,
            },
        }));

        logEvent('projects_list_query', {
            source: 'drizzle',
            durationMs: Date.now() - startedAt,
            rowCount: decorated.length,
        });

        return res.json(decorated);
    } catch (error) {
        log(`[Projects/List Error] ${error.message}`);
        return res.status(500).json(serverError());
    }
};

module.exports = {
    list,
    upsert: upsert('projects'),
    remove: deleteProject
};
