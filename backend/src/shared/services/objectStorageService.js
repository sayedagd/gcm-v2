const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : value;
};

const isProduction = process.env.NODE_ENV === 'production';

const getObjectStorageConfig = () => {
    const provider = (getEnvValue('BACKUP_STORAGE_PROVIDER') || '').toLowerCase();
    if (provider !== 's3') {
        return null;
    }

    const bucket = getEnvValue('S3_BACKUP_BUCKET');
    const region = getEnvValue('S3_BACKUP_REGION') || 'us-east-1';
    const accessKeyId = getEnvValue('S3_BACKUP_ACCESS_KEY_ID');
    const secretAccessKey = getEnvValue('S3_BACKUP_SECRET_ACCESS_KEY');
    const endpoint = getEnvValue('S3_BACKUP_ENDPOINT') || undefined;
    const forcePathStyle = getEnvValue('S3_BACKUP_FORCE_PATH_STYLE') === 'true';

    if (!bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return {
        provider: 's3',
        bucket,
        region,
        endpoint,
        forcePathStyle,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    };
};

const getS3Client = () => {
    const cfg = getObjectStorageConfig();
    if (!cfg) {
        return null;
    }

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

const isObjectStorageEnabled = () => {
    return !!getObjectStorageConfig();
};

const assertObjectStorageReadyForProduction = () => {
    if (!isProduction) return;

    if (!isObjectStorageEnabled()) {
        throw new Error('Production backups require object storage. Configure BACKUP_STORAGE_PROVIDER=s3 and S3_BACKUP_* env vars.');
    }
};

const uploadBuffer = async ({ key, body, contentType }) => {
    const s3 = getS3Client();
    if (!s3) {
        throw new Error('Object storage is not configured');
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

const getSignedDownloadUrl = async ({ key, fileName, expiresInSeconds = 300 }) => {
    const s3 = getS3Client();
    if (!s3) {
        throw new Error('Object storage is not configured');
    }

    const command = new GetObjectCommand({
        Bucket: s3.cfg.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename=${fileName}`
    });

    const url = await getSignedUrl(s3.client, command, { expiresIn: expiresInSeconds });
    return url;
};

module.exports = {
    isObjectStorageEnabled,
    assertObjectStorageReadyForProduction,
    uploadBuffer,
    getSignedDownloadUrl
};
