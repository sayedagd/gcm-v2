/**
 * GCM Dashboard Reporting Controller (Micro-Module)
 */
const { query } = require('../../../../database');
const { getPing } = require('../../../shared/controllers/systemController');

const buildScopeClause = (user) => {
    const params = [];
    const clauses = [];

    const pushClause = (sql, value) => {
        params.push(value);
        clauses.push(sql.replace('?', `$${params.length}`));
    };

    if (!user) {
        return { clause: '', params };
    }

    if (user.role === 'COMPANY_USER' && user.company_id) {
        pushClause('p.company_id = ?', user.company_id);
    } else if (user.role === 'PROJECT_USER' && user.project_id) {
        pushClause('t.project_id = ?', user.project_id);
    } else if (user.role === 'CLIENT') {
        if (user.project_id) {
            pushClause('t.project_id = ?', user.project_id);
        } else if (user.company_id) {
            pushClause('p.company_id = ?', user.company_id);
        }
    }

    return {
        clause: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
        params,
    };
};

const toNumber = (value) => Number(value || 0);

const getDashboardSeries = async (scopeClause, scopeParams) => {
    const params = [...scopeParams];

    const response = await query(
        `WITH day_bins AS (
            SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
        ),
        daily_metrics AS (
            SELECT
                t.date::date AS day,
                COALESCE(SUM(COALESCE(t.quantity, 0)), 0)::numeric AS volume,
                COALESCE(SUM(COALESCE(t.quantity, 0) * COALESCE(NULLIF(ps.unit_price, 0), 0)), 0)::numeric AS revenue,
                COUNT(*)::int AS trip_count
            FROM trips t
            LEFT JOIN projects p ON p.project_id = t.project_id
            LEFT JOIN project_services ps ON ps.project_id = t.project_id AND ps.service_id = t.service_id
            WHERE t.date >= CURRENT_DATE - INTERVAL '29 days'${scopeClause}
            GROUP BY t.date::date
        )
        SELECT
            to_char(b.day, 'Mon DD') AS date_label,
            b.day::text AS date_key,
            COALESCE(d.volume, 0)::numeric AS volume,
            COALESCE(d.revenue, 0)::numeric AS revenue,
            COALESCE(d.trip_count, 0)::int AS trip_count
        FROM day_bins b
        LEFT JOIN daily_metrics d ON d.day = b.day
        ORDER BY b.day`,
        params,
    );

    const series = (response.rows || []).map((row) => ({
        date: row.date_label,
        dateKey: row.date_key,
        volume: toNumber(row.volume),
        revenue: toNumber(row.revenue),
        trips: Number(row.trip_count || 0),
    }));

    const totals = series.reduce(
        (acc, point) => ({
            totalVolume: acc.totalVolume + point.volume,
            totalRevenue: acc.totalRevenue + point.revenue,
            totalTrips: acc.totalTrips + point.trips,
        }),
        { totalVolume: 0, totalRevenue: 0, totalTrips: 0 },
    );

    return { series, ...totals };
};

const getTopProjects = async (scopeClause, scopeParams) => {
    const response = await query(
        `SELECT
            t.project_id AS project_id,
            COALESCE(p.project_name, t.project_id) AS project_name,
            COALESCE(SUM(COALESCE(t.quantity, 0)), 0)::numeric AS volume,
            COALESCE(SUM(COALESCE(t.quantity, 0) * COALESCE(NULLIF(ps.unit_price, 0), 0)), 0)::numeric AS revenue,
            COUNT(*)::int AS trip_count
        FROM trips t
        LEFT JOIN projects p ON p.project_id = t.project_id
        LEFT JOIN project_services ps ON ps.project_id = t.project_id AND ps.service_id = t.service_id
        WHERE t.date >= CURRENT_DATE - INTERVAL '29 days'${scopeClause}
        GROUP BY t.project_id, p.project_name
        ORDER BY revenue DESC, trip_count DESC, volume DESC, project_name ASC
        LIMIT 5`,
        scopeParams,
    );

    return (response.rows || []).map((row) => ({
        projectId: row.project_id,
        projectName: row.project_name,
        volume: toNumber(row.volume),
        revenue: toNumber(row.revenue),
        tripCount: Number(row.trip_count || 0),
    }));
};

module.exports = {
    getStats: async (req, res, next) => {
        try {
            const { clause, params } = buildScopeClause(req.user || null);
            const [trend, topProjects] = await Promise.all([
                getDashboardSeries(clause, params),
                getTopProjects(clause, params),
            ]);

            return res.json({
                status: 'ok',
                generatedAt: new Date().toISOString(),
                revenueTrend: {
                    totalRevenue: trend.totalRevenue,
                    totalTrips: trend.totalTrips,
                    series: trend.series.map((point) => ({
                        date: point.date,
                        value: point.revenue,
                    })),
                },
                operationsTrend: {
                    totalVolume: trend.totalVolume,
                    totalTrips: trend.totalTrips,
                    series: trend.series.map((point) => ({
                        date: point.date,
                        value: point.volume,
                        trips: point.trips,
                    })),
                },
                topProjects,
            });
        } catch (error) {
            return next(error);
        }
    },
    getHealth: getPing,
};
