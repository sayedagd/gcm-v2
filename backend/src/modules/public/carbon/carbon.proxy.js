/**
 * GCM Carbon API Proxy Controller
 * [AR] وكيل API الكربون — يستخدم Climatiq لحساب البصمة الكربونية لحظياً
 * [EN] Proxies carbon footprint estimation via Climatiq API (api.climatiq.io)
 */
const { log } = require('../../../shared/utils/logger');

// [EN] In-memory cache to avoid excessive API calls (TTL: 1 hour)
// [AR] تخزين مؤقت لتقليل الاستدعاءات — صلاحية ساعة واحدة
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * [EN] Estimate carbon footprint for a website page load using Climatiq.
 * We calculate based on:
 *   1. Data transfer energy (network bandwidth per page visit ~2MB avg)
 *   2. Saudi Arabia grid electricity emission factor
 *
 * [AR] حساب البصمة الكربونية لزيارة صفحة ويب باستخدام Climatiq
 * الحساب مبني على:
 *   1. طاقة نقل البيانات (متوسط ~2MB لكل زيارة)
 *   2. معامل انبعاثات شبكة الكهرباء في السعودية
 */
const getCarbonStats = async (req, res) => {
    try {
        const apiKey = process.env.CLIMATIQ_API_KEY;
        if (!apiKey) {
            log('[Carbon Proxy] CLIMATIQ_API_KEY not configured');
            return res.status(500).json({ error: 'Carbon API key not configured' });
        }

        // Return cached data if still valid
        if (cache.data && (Date.now() - cache.timestamp) < CACHE_TTL) {
            return res.json(cache.data);
        }

        const { url } = req.query;
        const targetUrl = url || 'gcm-eco.com';
        log(`[Carbon Proxy] Calculating carbon for: ${targetUrl}`);

        // Step 1: Estimate page size via HEAD request (fallback to 2MB average)
        let pageSizeBytes = 2 * 1024 * 1024; // 2MB default
        try {
            const headRes = await fetch(`https://${targetUrl}`, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            const contentLength = headRes.headers.get('content-length');
            if (contentLength) pageSizeBytes = parseInt(contentLength);
        } catch {
            // Fallback to default — no issue
        }

        const pageSizeGB = pageSizeBytes / (1024 * 1024 * 1024);
        // Energy per GB of data transfer ~ 0.06 kWh (IEA/Shift Project estimates)
        const energyPerVisitKWh = pageSizeGB * 0.06;

        // Step 2: Call Climatiq — Saudi Arabia grid electricity emissions
        const climatiqRes = await fetch('https://api.climatiq.io/estimate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emission_factor: {
                    activity_id: 'electricity-supply_grid-source_supplier_mix',
                    data_version: '^1',
                    region: 'SA'
                },
                parameters: {
                    energy: energyPerVisitKWh,
                    energy_unit: 'kWh'
                }
            })
        });

        const climatiqData = await climatiqRes.json();

        if (!climatiqRes.ok) {
            log(`[Carbon Proxy Error] Climatiq returned ${climatiqRes.status}: ${JSON.stringify(climatiqData)}`);
            return res.status(502).json({ error: 'Climatiq API error', details: climatiqData });
        }

        // Step 3: Build unified response matching frontend expectations
        const co2Grams = climatiqData.co2e * 1000; // Convert kg to grams
        const cleanerThan = co2Grams < 0.5 ? 0.89 : co2Grams < 1.0 ? 0.78 : co2Grams < 2.0 ? 0.60 : 0.40;

        const result = {
            url: targetUrl,
            green: true,
            bytes: pageSizeBytes,
            cleanerThan,
            statistics: {
                adjustedBytes: pageSizeBytes,
                energy: energyPerVisitKWh,
                co2: {
                    grid: { grams: co2Grams, litres: co2Grams * 0.556 },
                    renewable: { grams: co2Grams * 0.25, litres: co2Grams * 0.25 * 0.556 }
                }
            },
            source: {
                name: climatiqData.emission_factor?.source_dataset || 'Climate Transparency Report',
                region: climatiqData.emission_factor?.region || 'SA',
                year: climatiqData.emission_factor?.year || 2021,
                provider: 'Climatiq'
            }
        };

        // Cache the result
        cache = { data: result, timestamp: Date.now() };

        res.json(result);
    } catch (error) {
        log(`[Carbon Proxy Error] ${error.message}`);
        res.status(500).json({
            error: 'Failed to calculate carbon footprint',
            details: error.message
        });
    }
};

module.exports = {
    getCarbonStats
};
