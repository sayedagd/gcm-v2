/**
 * OCR Controller (async job model)
 */
const { log } = require('../../../shared/utils/logger');
const {
    createOcrJob,
    getOcrJobById,
    parseImagePayload,
} = require('./ocr.service');

const generateJobId = () => `OCR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const submitDeliveryNoteOCRJob = async (req, res) => {
    try {
        const { image, callback_url: callbackUrl } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image base64 is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            log('[OCR] Error: GEMINI_API_KEY is not configured');
            return res.status(500).json({ error: 'AI Vision is not configured on the server.' });
        }

        const jobId = generateJobId();
        const { mimeType } = parseImagePayload(image);
        const requestedBy = req.user?.id || null;

        await createOcrJob({
            jobId,
            image,
            mimeType,
            callbackUrl,
            requestedBy,
        });

        log(`[OCR] Job queued: ${jobId}`);

        return res.status(202).json({
            status: 'accepted',
            job_id: jobId,
            polling_url: `/api/v1/ai/ocr/vision/jobs/${jobId}`,
            callback_url: callbackUrl || null,
        });
    } catch (error) {
        log(`[OCR] Submit Error: ${error.message}`);
        return res.status(500).json({ error: 'Failed to queue OCR job' });
    }
};

const getDeliveryNoteOCRJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await getOcrJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'OCR job not found' });
        }

        return res.json({
            job_id: job.job_id,
            status: job.status,
            extracted: job.extracted_data || null,
            error: job.error_message || null,
            attempts: job.attempts,
            created_at: job.created_at,
            started_at: job.started_at,
            completed_at: job.completed_at,
            next_attempt_at: job.next_attempt_at,
            dead_lettered_at: job.dead_lettered_at,
        });
    } catch (error) {
        log(`[OCR] Status Error: ${error.message}`);
        return res.status(500).json({ error: 'Failed to fetch OCR job status' });
    }
};

const processDeliveryNoteOCR = submitDeliveryNoteOCRJob;

module.exports = {
    processDeliveryNoteOCR,
    submitDeliveryNoteOCRJob,
    getDeliveryNoteOCRJobStatus,
};

