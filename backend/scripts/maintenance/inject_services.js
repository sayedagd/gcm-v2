const db = require('../../database');

async function injectServices() {
    console.log("Starting to inject the new parsed services...");

    const services = [
        // Categories
        { id: 'CAT-NH', name: 'Non-Hazardous waste', desc: 'Category' },
        { id: 'CAT-H', name: 'Hazardous waste', desc: 'Category' },
        { id: 'CAT-W', name: 'Supplying water', desc: 'Category' },

        // Non-Hazardous
        { id: 'NH-01', name: 'Paper', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-02', name: 'Cardboard', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-03', name: 'Wood', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-04', name: 'Plastic', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-05', name: 'Metal / Steel', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-06', name: 'Concrete', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-07', name: 'Food Waste', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-08', name: 'General Waste', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-09', name: 'Asphalt', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-10', name: 'Glass', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-11', name: 'Excavated Material', desc: 'Non-Hazardous', parent: 'CAT-NH' },
        { id: 'NH-12', name: 'Electronic (specify)', desc: 'Non-Hazardous', parent: 'CAT-NH' },

        // Hazardous
        { id: 'H-01', name: 'Oils / Fuels / Oily Water', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-02', name: 'Tires', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-03', name: 'Concrete Wash Water', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-04', name: 'Sewage', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-05', name: 'Contaminated Material', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-06', name: 'Contaminated Soil', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-07', name: 'Rags / Drums / Filters', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-08', name: 'Batteries', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-09', name: 'Asbestos', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-10', name: 'Medical', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-11', name: 'Electronic (specify)', desc: 'Hazardous', parent: 'CAT-H' },
        { id: 'H-12', name: 'Other (    )', desc: 'Hazardous', parent: 'CAT-H' },

        // Supplying water
        { id: 'W-01', name: 'Sweet water', desc: 'Supplying water', parent: 'CAT-W' },
        { id: 'W-02', name: 'Drinking water', desc: 'Supplying water', parent: 'CAT-W' },
        { id: 'W-03', name: 'Dust control', desc: 'Supplying water', parent: 'CAT-W' }
    ];

    try {
        // Since there are foreign keys from trips, project_services, etc., deleting might be dangerous.
        // We will insert on conflict update using the service_id.
        // Since we don't know existing IDs, we are using new IDs (NH-01, etc).
        // Let's first insert the categories:
        // Process new services
        for (const s of services) {
            const query = `
                INSERT INTO services (service_id, service_name, service_description, parent_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (service_id) 
                DO UPDATE SET 
                    service_name = EXCLUDED.service_name,
                    service_description = EXCLUDED.service_description,
                    parent_id = EXCLUDED.parent_id
            `;
            await db.query(query, [s.id, s.name, s.desc, s.parent || null]);
            console.log("Processed Service:", s.name);
        }

        // --- NEW: Inject Facilities ---
        console.log("Syncing Facilities...");
        const facilities = [
            { id: 'FAC-1775181877143', name: 'Recycle solutions', type: 'RECYCLE', c_no: '3213213', start: '2026-04-02', end: '2026-05-09', svcs: '["NH-01","NH-02","NH-03","NH-04"]', loc: 'https://www.google.com/maps?q=29.078101824740507,31.105374521989937' },
            { id: 'FAC-1775181946315', name: 'metal yabi', type: 'RECYCLE', c_no: '394783', start: '2026-03-29', end: '2026-07-11', svcs: '[]', loc: 'https://www.google.com/maps?q=29.078101824740507,31.105374521989937' },
            { id: 'FAC-1775181978234', name: 'Sulai', type: 'DISPOSAL', c_no: null, start: null, end: null, svcs: '["NH-07"]', loc: 'https://www.google.com/maps?q=29.078101824740507,31.105374521989937' },
            { id: 'FAC-1775181751550', name: 'NWC', type: 'SEWAGE_TREATMENT', c_no: '903213', start: '2026-04-01', end: '2026-05-09', svcs: '["H-04"]', loc: 'https://www.google.com/maps?q=29.078089834879982,31.10540668697242' },
            { id: 'FAC-1775182094259', name: 'DAMAM', type: 'DISPOSAL', c_no: '97q8974', start: '2026-03-29', end: '2026-08-21', svcs: '["H-01","H-02","H-03","H-05","H-06","H-07","H-08","H-09"]', loc: 'https://www.google.com/maps?q=29.07809940304938,31.105353665752126' }
        ];

        for (const f of facilities) {
            const fQuery = `
                INSERT INTO facilities (facility_id, name, type, contract_no, contract_start, contract_end, accepted_services, location_url, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
                ON CONFLICT (facility_id) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    contract_no = EXCLUDED.contract_no,
                    accepted_services = EXCLUDED.accepted_services,
                    location_url = EXCLUDED.location_url
            `;
            await db.query(fQuery, [f.id, f.name, f.type, f.c_no, f.start, f.end, f.svcs, f.loc]);
            console.log("Processed Facility:", f.name);
        }

        console.log("All constants (Services & Facilities) have been synced.");
        process.exit(0);

    } catch (err) {
        console.error("Error updating services:", err);
        process.exit(1);
    }
}

// Give a second for connection to establish before running
setTimeout(injectServices, 1000);
