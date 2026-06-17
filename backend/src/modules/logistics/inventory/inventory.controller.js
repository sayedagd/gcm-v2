/**
 * GCM Inventory Controller (Micro-Module)
 */
const { list, upsert, remove } = require('../../../shared/controllers/crudController');
const { query } = require('../../../../database');

const toNumber = (value) => Number(value || 0);

const getInventoryAnalytics = async (req, res, next) => {
    try {
        const result = await query(
            `WITH day_bins AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
            ),
            daily_usage AS (
                SELECT
                    t.date::date AS day,
                    COUNT(*)::int AS trip_count,
                    COUNT(DISTINCT t.inventory_item_id)::int AS inventory_items
                FROM trips t
                WHERE t.inventory_item_id IS NOT NULL
                  AND t.date >= CURRENT_DATE - INTERVAL '6 days'
                GROUP BY t.date::date
            )
            SELECT
                to_char(b.day, 'Dy') AS day_label,
                b.day::text AS day_key,
                COALESCE(u.trip_count, 0)::int AS trip_count,
                COALESCE(u.inventory_items, 0)::int AS inventory_items
            FROM day_bins b
            LEFT JOIN daily_usage u ON u.day = b.day
            ORDER BY b.day`
        );

        const series = (result.rows || []).map((row) => ({
            day: row.day_label,
            dayKey: row.day_key,
            value: toNumber(row.trip_count),
            inventoryItems: toNumber(row.inventory_items),
        }));

        const totalTrips = series.reduce((sum, point) => sum + point.value, 0);
        const activeDays = series.filter((point) => point.value > 0).length;

        return res.json({
            status: 'ok',
            generatedAt: new Date().toISOString(),
            hasHistory: totalTrips > 0,
            totalTrips,
            activeDays,
            series,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    listContainers: list('containers'),
    upsertContainer: upsert('containers'),
    listTanks: list('tanks'),
    upsertTank: upsert('tanks'),
    listScales: list('scales'),
    upsertScale: upsert('scales'),
    listSizes: list('inventory_sizes'),
    upsertSize: upsert('inventory_sizes'),
    getAnalytics: getInventoryAnalytics,
    remove: (table) => remove(table)
};
