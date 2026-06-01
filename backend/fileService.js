const fs = require('fs');
const path = require('path');
const {
    isUploadsObjectStorageEnabled,
    uploadUploadBuffer,
    resolveUploadUrl
} = require('./src/shared/services/uploadStorageService');

const UPLOADS_ROOT = path.join(__dirname, 'uploads');

/**
 * Ensures a directory exists recursively.
 */
const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

const parseBase64Payload = (base64Data) => {
    const matches = base64Data.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }
    return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
    };
};

/**
 * Extracts the week number of the month for a given date.
 */
const getWeekOfMonth = (date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    return Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);
};

/**
 * Saves a base64 file to a structured hierarchical path.
 * Path: uploads/[Company]/[Project]/[Service]/[Year]/[Month]/Week_[N]/[FileName]
 */
const saveFileHierarchical = async ({
    base64Data,
    companyName,
    projectName,
    serviceName,
    date,
    fileName
}) => {
    if (!base64Data || !base64Data.startsWith('data:')) return null;

    try {
        // 1. Prepare segments
        const tripDate = date ? new Date(date) : new Date();
        const year = tripDate.getFullYear().toString();
        const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
        const week = `Week_${getWeekOfMonth(tripDate)}`;

        // Clean names for filesystem
        const cleanName = (name) => name.replace(/[<>:"/\\|?*]/g, '_').trim();

        const safeCompany = cleanName(companyName || 'General');
        const safeProject = cleanName(projectName || 'General');
        const safeService = cleanName(serviceName || 'General');

        // 2. Build full path
        const relativePath = path.join(
            safeCompany,
            safeProject,
            safeService,
            year,
            month,
            week
        );
        const absoluteDirPath = path.join(UPLOADS_ROOT, relativePath);

        // 3. Extract buffer from base64
        const { mimeType, buffer } = parseBase64Payload(base64Data);

        // 4. Final file path
        const finalFileName = `${Date.now()}_${cleanName(fileName)}`;
        const objectKey = `${relativePath.replace(/\\/g, '/')}/${finalFileName}`;

        if (isUploadsObjectStorageEnabled()) {
            await uploadUploadBuffer({
                key: objectKey,
                body: buffer,
                contentType: mimeType
            });
            return resolveUploadUrl(objectKey);
        }

        // 5. Local fallback (dev only)
        await ensureDir(absoluteDirPath);
        const finalFilePath = path.join(absoluteDirPath, finalFileName);
        await fs.promises.writeFile(finalFilePath, buffer);

        // 6. Return relative URL path for DB storage
        return `/uploads/${relativePath.replace(/\\/g, '/')}/${finalFileName}`;
    } catch (error) {
        console.error('[FileService Error]', error);
        return null;
    }
};

/**
 * Saves non-trip documents (Company/Project specific)
 */
const saveEntityDoc = async (entityType, entityName, fileName, base64Data) => {
    if (!base64Data || !base64Data.startsWith('data:')) return null;

    try {
        const cleanName = (name) => name.replace(/[<>:"/\\|?*]/g, '_').trim();
        const safeEntity = cleanName(entityName || 'General');

        let relativePath = '';
        switch (entityType) {
            case 'company':
                relativePath = path.join(safeEntity, '_company_docs');
                break;
            case 'project':
                relativePath = path.join('_orphans', 'projects', safeEntity, '_project_docs');
                break;
            case 'supplier':
                relativePath = path.join('_suppliers', safeEntity);
                break;
            case 'driver':
                relativePath = path.join('_fleet', 'drivers', safeEntity);
                break;
            case 'vehicle':
                relativePath = path.join('_fleet', 'vehicles', safeEntity);
                break;
            case 'user':
                relativePath = path.join('_users', safeEntity);
                break;
            case 'container':
                relativePath = path.join('_assets', 'containers', safeEntity);
                break;
            case 'tank':
                relativePath = path.join('_assets', 'tanks', safeEntity);
                break;
            default:
                relativePath = path.join('_others', entityType, safeEntity);
        }

        const absoluteDirPath = path.join(UPLOADS_ROOT, relativePath);
        const { mimeType, buffer } = parseBase64Payload(base64Data);
        const finalFileName = `${Date.now()}_${cleanName(fileName)}`;
        const objectKey = `${relativePath.replace(/\\/g, '/')}/${finalFileName}`;

        if (isUploadsObjectStorageEnabled()) {
            await uploadUploadBuffer({
                key: objectKey,
                body: buffer,
                contentType: mimeType
            });
            return resolveUploadUrl(objectKey);
        }

        await ensureDir(absoluteDirPath);
        const finalFilePath = path.join(absoluteDirPath, finalFileName);
        await fs.promises.writeFile(finalFilePath, buffer);
        return `/uploads/${relativePath.replace(/\\/g, '/')}/${finalFileName}`;
    } catch (error) {
        console.error('[FileService Entity Error]', error);
        return null;
    }
};

module.exports = {
    saveFileHierarchical,
    saveEntityDoc
};
