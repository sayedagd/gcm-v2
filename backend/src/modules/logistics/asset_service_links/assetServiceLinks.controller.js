/**
 * GCM Asset-Service Links Controller
 * [AR] ربط الأصول (سيارات، حاويات، تانكات) بأنواع الخدمات
 * [EN] Links assets (vehicles, containers, tanks) to service types (N:N)
 */
const { query } = require('../../../../database');
const { log } = require('../../../shared/utils/logger');

const VALID_ASSET_TYPES = ['VEHICLE', 'CONTAINER', 'TANK'];

/**
 * GET /api/asset-service-links
 * [AR] جلب كل الروابط
 */
const listAll = async (req, res) => {
    try {
        const result = await query('SELECT * FROM asset_service_links ORDER BY asset_type, asset_id');
        res.json(result.rows);
    } catch (e) {
        log(`[AssetServiceLinks] List error: ${e.message}`);
        res.status(500).json({ errorAr: 'فشل جلب الروابط', errorEn: 'Failed to fetch links' });
    }
};

/**
 * GET /api/asset-service-links/:assetType/:assetId
 * [AR] جلب الخدمات المرتبطة بأصل معين
 */
const getByAsset = async (req, res) => {
    try {
        const { assetType, assetId } = req.params;
        if (!VALID_ASSET_TYPES.includes(assetType)) {
            return res.status(400).json({ errorAr: 'نوع أصل غير صالح', errorEn: 'Invalid asset type' });
        }
        const result = await query(
            'SELECT * FROM asset_service_links WHERE asset_type = $1 AND asset_id = $2 ORDER BY service_id',
            [assetType, assetId]
        );
        res.json(result.rows);
    } catch (e) {
        log(`[AssetServiceLinks] GetByAsset error: ${e.message}`);
        res.status(500).json({ errorAr: 'فشل جلب الروابط', errorEn: 'Failed to fetch links' });
    }
};

/**
 * PUT /api/asset-service-links/:assetType/:assetId
 * [AR] تحديث ربط أصل بخدمات — يحذف القديم ويضيف الجديد (full sync)
 * Body: { service_ids: ['SVC-1', 'SVC-2'] }
 */
const syncLinks = async (req, res) => {
    try {
        const { assetType, assetId } = req.params;
        const { service_ids } = req.body;

        if (!VALID_ASSET_TYPES.includes(assetType)) {
            return res.status(400).json({ errorAr: 'نوع أصل غير صالح', errorEn: 'Invalid asset type' });
        }
        if (!Array.isArray(service_ids)) {
            return res.status(400).json({ errorAr: 'service_ids يجب أن يكون مصفوفة', errorEn: 'service_ids must be an array' });
        }

        // Delete existing links
        await query('DELETE FROM asset_service_links WHERE asset_type = $1 AND asset_id = $2', [assetType, assetId]);

        // Insert new links
        if (service_ids.length > 0) {
            const values = service_ids.map((sid, i) =>
                `($1, $2, $${i + 3})`
            ).join(', ');
            await query(
                `INSERT INTO asset_service_links (asset_type, asset_id, service_id) VALUES ${values} ON CONFLICT DO NOTHING`,
                [assetType, assetId, ...service_ids]
            );
        }

        // Return updated links
        const result = await query(
            'SELECT * FROM asset_service_links WHERE asset_type = $1 AND asset_id = $2 ORDER BY service_id',
            [assetType, assetId]
        );

        log(`[AssetServiceLinks] Synced ${assetType}/${assetId} → ${service_ids.length} services`);
        res.json({ status: 'success', links: result.rows });
    } catch (e) {
        log(`[AssetServiceLinks] Sync error: ${e.message}`);
        res.status(500).json({ errorAr: 'فشل تحديث الروابط', errorEn: 'Failed to sync links' });
    }
};

module.exports = { listAll, getByAsset, syncLinks };
