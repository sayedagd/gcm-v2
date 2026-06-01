const { query } = require('../database.js');

(async () => {
    try {
        console.log("Checking duplicates...");
        let dupM = await query(`
            SELECT waste_manifest_no, count(*) 
            FROM trips 
            WHERE waste_manifest_no IS NOT NULL AND waste_manifest_no != '' 
            GROUP BY waste_manifest_no HAVING count(*) > 1
        `);
        console.log("Manifest Dups:", dupM.rows);

        let dupD = await query(`
            SELECT delivery_note_no, count(*) 
            FROM trips 
            WHERE delivery_note_no IS NOT NULL AND delivery_note_no != '' 
            GROUP BY delivery_note_no HAVING count(*) > 1
        `);
        console.log("Delivery Note Dups:", dupD.rows);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
