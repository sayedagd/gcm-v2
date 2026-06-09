-- Create OCR async jobs table for polling/webhook flow
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
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status_created_at ON ocr_jobs (status, created_at);
