const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getUploadsStorageConfig = () => {
    const provider = (process.env.UPLOADS_STORAGE_PROVIDER || '').toLowerCase();
    if (provider !== 's3') {
        return null;
    }

    const bucket = process.env.S3_UPLOADS_BUCKET;
    const region = process.env.S3_UPLOADS_REGION || process.env.S3_BACKUP_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_UPLOADS_ACCESS_KEY_ID || process.env.S3_BACKUP_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_UPLOADS_SECRET_ACCESS_KEY || process.env.S3_BACKUP_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_UPLOADS_ENDPOINT || process.env.S3_BACKUP_ENDPOINT || undefined;
    const forcePathStyle = process.env.S3_UPLOADS_FORCE_PATH_STYLE === 'true' || process.env.S3_BACKUP_FORCE_PATH_STYLE === 'true';
    const publicBaseUrl = process.env.UPLOADS_PUBLIC_BASE_URL || '';

    if (!bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return {
        provider: 's3',
        bucket,
        region,
        endpoint,
        forcePathStyle,
        publicBaseUrl,
        credentials: { accessKeyId, secretAccessKey }
    };
};

const getUploadsS3Client = () => {
    const cfg = getUploadsStorageConfig();
    if (!cfg) return null;

    return {
        cfg,
        client: new S3Client({
            region: cfg.region,
            endpoint: cfg.endpoint,
            forcePathStyle: cfg.forcePathStyle,
            credentials: cfg.credentials
        })
    };
};

const isUploadsObjectStorageEnabled = () => !!getUploadsStorageConfig();

const uploadUploadBuffer = async ({ key, body, contentType }) => {
    const s3 = getUploadsS3Client();
    if (!s3) {
        throw new Error('Uploads object storage is not configured');
    }

    await s3.client.send(new PutObjectCommand({
        Bucket: s3.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
    }));

    return {
        provider: 's3',
        bucket: s3.cfg.bucket,
        key
    };
};

const getSignedUploadReadUrl = async ({ key, expiresInSeconds = 300 }) => {
    const s3 = getUploadsS3Client();
    if (!s3) {
        throw new Error('Uploads object storage is not configured');
    }

    const command = new GetObjectCommand({
        Bucket: s3.cfg.bucket,
        Key: key
    });

    return getSignedUrl(s3.client, command, { expiresIn: expiresInSeconds });
};

const resolveUploadUrl = (key) => {
    const cfg = getUploadsStorageConfig();
    if (!cfg || !cfg.publicBaseUrl) {
        return `/uploads/${key}`;
    }

    return `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`;
};

module.exports = {
    isUploadsObjectStorageEnabled,
    uploadUploadBuffer,
    getSignedUploadReadUrl,
    resolveUploadUrl
};
