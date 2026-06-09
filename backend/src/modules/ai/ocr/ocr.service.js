const { query } = require('../../../../database');
const { log } = require('../../../shared/utils/logger');

let ensureTablePromise = null;
const OCR_JOB_MAX_ATTEMPTS = Number.parseInt(process.env.OCR_JOB_MAX_ATTEMPTS || '5', 10);
const OCR_JOB_BACKOFF_BASE_SECONDS = Number.parseInt(process.env.OCR_JOB_BACKOFF_BASE_SECONDS || '10', 10);

const buildNextAttemptAt = (attempts) => {
    const cappedAttempts = Math.max(1, Number(attempts || 1));
    const delaySeconds = OCR_JOB_BACKOFF_BASE_SECONDS * (2 ** (cappedAttempts - 1));
    return new Date(Date.now() + (delaySeconds * 1000));
};

const ensureOcrJobsTable = async () => {
    if (!ensureTablePromise) {
        ensureTablePromise = (async () => {
            await query(`
                CREATE TABLE IF NOT EXISTS ocr_jobs (
                    job_id VARCHAR(100) PRIMARY KEY,
                    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                    image_data TEXT NOT NULL,
                    mime_type VARCHAR(100),
                    callback_url TEXT,
                    requested_by VARCHAR(100),
                    extracted_data JSONB,
                    error_message TEXT,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    dead_lettered_at TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query('CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status_created_at ON ocr_jobs (status, created_at)');
            await query('ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
            await query('ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMP');
        })().catch((error) => {
            ensureTablePromise = null;
            throw error;
        });
    }

    return ensureTablePromise;
};

const buildPrompt = () => `You are a highly accurate OCR assistant specialized in Arabic and English handwritten text reading for Waste Management forms (Delivery Notes / Manifests).
Your ONLY task is to extract data from the provided image and return it in pure JSON format.
There must be NO markdown formatting, NO \`\`\`json blocks, and NO conversational text. Just the strictly valid JSON object.

Extract the following fields if present:
- "delivery_note_no": Look for "No.", "DN", "رقم السند". Return just the number (e.g., "123456").
- "waste_manifest_no": Look for Manifest number if any.
- "date": The date of the trip in YYYY-MM-DD format (if possible) or whatever is written.
- "quantity": (Number only) Look for "الكمية", "الوزن", "Quantity", "QTY", "Weight".
- "unit": (String: TON, KG, CBM)
- "company_name": Client name, "العميل", "الشركة".
- "project_name": Project name, "المشروع", "الموقع".
- "driver_name": Driver's name, "السائق".
- "vehicle_plate": Vehicle Plate number, "رقم اللوحة", "السيارة".
- "service_name": Material type, "النفايات", "نوع المادة", "الخدمة".

If a field is not found or unreadable, set its value to null. Output standard JSON.`;

const parseImagePayload = (image) => {
    let base64Data = image;
    let mimeType = 'image/jpeg';

    if (typeof image === 'string' && image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
        }
    }

    return { base64Data, mimeType };
};

const normalizeGeminiJson = (rawContent) => {
    let jsonStr = String(rawContent || '').trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```/g, '').trim();
    }

    return JSON.parse(jsonStr);
};

const extractDeliveryNoteFromImage = async ({ image, apiKey }) => {
    const { base64Data, mimeType } = parseImagePayload(image);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: buildPrompt() },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data,
                        },
                    },
                ],
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024,
            },
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to process image with AI Vision');
    }

    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
        throw new Error('AI returned an empty response.');
    }

    return normalizeGeminiJson(rawContent);
};

const createOcrJob = async ({ jobId, image, mimeType, callbackUrl, requestedBy }) => {
    await ensureOcrJobsTable();
    await query(
        `INSERT INTO ocr_jobs (job_id, status, image_data, mime_type, callback_url, requested_by)
         VALUES ($1, 'PENDING', $2, $3, $4, $5)`,
        [jobId, image, mimeType, callbackUrl || null, requestedBy || null]
    );
};

const getOcrJobById = async (jobId) => {
    await ensureOcrJobsTable();
    const result = await query(
        `SELECT job_id, status, callback_url, requested_by, extracted_data, error_message,
            attempts, created_at, started_at, completed_at, next_attempt_at, dead_lettered_at, updated_at
         FROM ocr_jobs
         WHERE job_id = $1
         LIMIT 1`,
        [jobId]
    );

    return result.rows[0] || null;
};

const claimPendingOcrJob = async () => {
    await ensureOcrJobsTable();
    const result = await query(
        `UPDATE ocr_jobs
         SET status = 'PROCESSING',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP,
             attempts = attempts + 1
         WHERE job_id = (
             SELECT job_id
             FROM ocr_jobs
             WHERE status IN ('PENDING', 'RETRY')
               AND COALESCE(next_attempt_at, created_at) <= CURRENT_TIMESTAMP
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 1
         )
         RETURNING job_id, image_data, callback_url, requested_by, attempts`,
        []
    );

    return result.rows[0] || null;
};

const completeOcrJob = async ({ jobId, extractedData }) => {
    await ensureOcrJobsTable();
    await query(
        `UPDATE ocr_jobs
         SET status = 'COMPLETED',
             extracted_data = $2::jsonb,
             error_message = NULL,
             completed_at = CURRENT_TIMESTAMP,
             next_attempt_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $1`,
        [jobId, JSON.stringify(extractedData)]
    );
};

const failOcrJob = async ({ jobId, errorMessage, attempts }) => {
    await ensureOcrJobsTable();
    const message = String(errorMessage || 'Unknown OCR failure');
    const attemptCount = Number(attempts || 1);

    if (attemptCount >= OCR_JOB_MAX_ATTEMPTS) {
        await query(
            `UPDATE ocr_jobs
             SET status = 'DEAD_LETTER',
                 error_message = $2,
                 completed_at = CURRENT_TIMESTAMP,
                 dead_lettered_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE job_id = $1`,
            [jobId, message]
        );
        return 'DEAD_LETTER';
    }

    const nextAttemptAt = buildNextAttemptAt(attemptCount);
    await query(
        `UPDATE ocr_jobs
         SET status = 'RETRY',
             error_message = $2,
             next_attempt_at = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $1`,
        [jobId, message, nextAttemptAt.toISOString()]
    );

    return 'RETRY';
};

const notifyJobCompletion = async ({ callbackUrl, jobId, status, extractedData, errorMessage }) => {
    if (!callbackUrl) return;

    try {
        await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_id: jobId,
                status,
                extracted: extractedData || null,
                error: errorMessage || null,
                completed_at: new Date().toISOString(),
            }),
        });
    } catch (error) {
        log(`[OCR] Callback delivery failed for job ${jobId}: ${error.message}`);
    }
};

module.exports = {
    ensureOcrJobsTable,
    createOcrJob,
    getOcrJobById,
    claimPendingOcrJob,
    completeOcrJob,
    failOcrJob,
    notifyJobCompletion,
    extractDeliveryNoteFromImage,
    parseImagePayload,
};
