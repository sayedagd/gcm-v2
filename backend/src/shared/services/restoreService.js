const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { transaction } = require('../../../database');
const { log } = require('../utils/logger');

const processRestoreUpload = async (filePath, fileType) => {
    log(`[RESTORE] Starting restore from file: ${filePath} (${fileType})`);
    try {
        let sqlContent = '';

        if (fileType === 'application/zip' || filePath.endsWith('.zip') || fileType === 'application/x-zip-compressed') {
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();

            // Find SQL dump
            const sqlEntry = zipEntries.find(e => e.entryName === 'database_dump.sql');
            if (!sqlEntry) {
                throw new Error("Invalid Backup: 'database_dump.sql' not found in the ZIP archive.");
            }
            sqlContent = zip.readAsText(sqlEntry);

            // Extract uploads folder
            const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Extract the entire zip contents to the backend root directory
            // This will place the 'uploads/' folder correctly and overwrite existing files
            log(`[RESTORE] Extracting uploads media...`);
            zip.extractAllTo(path.join(__dirname, '..', '..', '..'), true); 
        } else {
            // It's a plain SQL file
            sqlContent = fs.readFileSync(filePath, 'utf8');
        }

        if (!sqlContent || (!sqlContent.includes('INSERT INTO') && !sqlContent.includes('DELETE FROM'))) {
             throw new Error("Invalid Backup: The SQL file appears to be empty or corrupted.");
        }

        log(`[RESTORE] Executing SQL script...`);
        
        await transaction(async (client) => {
             // Execute the full SQL dump
             await client.query(sqlContent);
        });

        log(`[RESTORE] SUCCESS: Database restored successfully.`);
        
        // Remove the extracted database_dump.sql from backend root if it was extracted there
        const tempSqlPath = path.join(__dirname, '..', '..', '..', 'database_dump.sql');
        if (fs.existsSync(tempSqlPath)) {
            fs.unlinkSync(tempSqlPath);
        }

        return { status: 'success', message: 'System restored successfully' };
    } catch (error) {
        log(`[RESTORE ERROR] ${error.message}`);
        throw error;
    } finally {
        // Cleanup uploaded temp file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

module.exports = {
    processRestoreUpload
};
