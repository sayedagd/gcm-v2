/**
 * GCM ERP - Advanced Realistic Seeding Script
 * [AR] سكريبت بذر داتا واقعية 100% للتجربة الشاملة
 * Target: Companies (BUJV, NMJV, CCC, Nesma), Projects, Users, Assets, 500+ Trips.
 */

const { query, waitForDb } = require('../database');
const { log } = require('../src/shared/utils/logger');

const runSeed = async () => {
    try {
        console.log('--- STARTING CONTEXTUAL DATA SEEDING ---');
        await waitForDb();

        // 0. Truncate Tables (Atomic Clear)
        console.log('[1/9] Clearing existing test data...');
        await query(`TRUNCATE TABLE 
            trips, notifications, activity_logs, project_services, 
            projects, companies, users, vehicles, drivers, 
            containers, tanks, scales, suppliers, environmental_equipments, equipment_inquiries,
            project_supplier_rates, ai_sessions, ai_messages, facilities
            RESTART IDENTITY CASCADE`);

        // 1. Create System & Global Admin
        // ... (existing code remains for steps 1-7)
        console.log('[2/9] Creating Root Users...');
        await query(`INSERT INTO users (id, name, email, password, role) VALUES 
            ('SYSTEM', 'System Engine', 'system@gcm.local', 'SYSTEM_ACCOUNT', 'ADMIN'),
            ('ADMIN-MASTER', 'Eng. Yusuf (GCM Master)', 'eng-yusuf@gcm-gulf.com', '123', 'ADMIN')
        ON CONFLICT DO NOTHING`);

        // 2. Define Companies
        console.log('[3/9] Creating Companies (BUJV, NMJV, CCC, Nesma)...');
        const companies = [
            { id: 'C-BUJV', name: 'Binladin Utama JV', email: 'info@bujv.sa', logo: '/logo-light.png' },
            { id: 'C-NMJV', name: 'Nesma & Partners JV', email: 'projects@nesmapartners.com', logo: '/logo-light.png' },
            { id: 'C-CCC', name: 'Consolidated Contractors Co.', email: 'ksa-ops@ccc.net', logo: '/logo-light.png' },
            { id: 'C-NESMA', name: 'Nesma Infrastructure', email: 'infra@nesma.com', logo: '/logo-light.png' }
        ];

        for (const c of companies) {
            await query(`INSERT INTO companies (company_id, company_name, contact_email, logo_url, client_since) VALUES ($1, $2, $3, $4, NOW())`,
                [c.id, c.name, c.email, c.logo]);
            
            const mgrId = `U-MGR-${c.id}`;
            await query(`INSERT INTO users (id, name, email, password, role, company_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                [mgrId, `${c.id} Manager`, `mgr@${c.id.toLowerCase()}.com`, '123', 'COMPANY_USER', c.id]);
        }

        // 3. Define Projects
        console.log('[4/9] Creating Infrastructure Projects...');
        const projects = [
            { id: 'P-SIX', name: 'Six Senses Southern Dunes', cid: 'C-BUJV' },
            { id: 'P-POLO', name: 'Polo Club Amaala', cid: 'C-BUJV' },
            { id: 'P-AMAN', name: 'Aman Sammar Resort', cid: 'C-BUJV' },
            { id: 'P-FAENA', name: 'Faena Amaala', cid: 'C-BUJV' },
            { id: 'P-CHEDI', name: 'The Chedi Amaala', cid: 'C-BUJV' },
            { id: 'P-OBEROI', name: 'Oberoi Red Sea', cid: 'C-BUJV' },
            { id: 'P-JAQA', name: 'QCD-JAQA (Quayside)', cid: 'C-NMJV' },
            { id: 'P-RITZ', name: 'QCD-RITZ (Ritz Carlton)', cid: 'C-NMJV' },
            { id: 'P-ADDRESS', name: 'QCD-ADDRESS (The Address)', cid: 'C-NMJV' },
            { id: 'P-802', name: 'Site 802 - Main Infrastructure', cid: 'C-NESMA' },
            { id: 'P-805', name: 'Site 805 - Utility Hub', cid: 'C-NESMA' }
        ];

        for (const p of projects) {
            await query(`INSERT INTO projects (project_id, project_name, company_id, status, budget, total_quantities, start_date, logo_url) VALUES ($1, $2, $3, 'ACTIVE', 15000000, 50000, '2024-01-01', '/logo-light.png')`,
                [p.id, p.name, p.cid]);
            
            const supId = `U-SUP-${p.id}`;
            await query(`INSERT INTO users (id, name, email, password, role, company_id, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [supId, `${p.id} Supervisor`, `sup@${p.id.toLowerCase()}.com`, '123', 'PROJECT_USER', p.cid, p.id]);
        }

        // 4. Create Services
        console.log('[5/9] Initializing Services...');
        const services = [
            { id: 'S-CONC', name: 'Concrete Supply', desc: 'Ready-mix concrete delivery' },
            { id: 'S-SEWG', name: 'Sewage Removal', desc: 'Liquid waste management' },
            { id: 'S-HAZ', name: 'Hazardous Waste', desc: 'Chemical/Hazardous disposal' }
        ];

        for (const s of services) {
            await query(`INSERT INTO services (service_id, service_name, service_description) VALUES ($1, $2, $3) ON CONFLICT (service_id) DO NOTHING`,
                [s.id, s.name, s.desc]);
        }

        for (const p of projects) {
            for (const s of services) {
                await query(`INSERT INTO project_services (project_id, service_id, quantity, unit_price, total_cost) VALUES ($1, $2, 1000, 250, 250000)`,
                    [p.id, s.id]);
            }
        }

        // 7.5 ADDING FACILITIES
        console.log('[7.5/9] Establishing Treatment Facilities (NWC, AKAM, DMAM)...');
        const facilities = [
            { id: 'F-NWC', name: 'National Water Company (NWC)', loc: 'South Treatment Plant', services: ['S-SEWG'] },
            { id: 'F-AKAM', name: 'AKAM Concrete Solutions', loc: 'Metropolitan Plant', services: ['S-CONC'] },
            { id: 'F-DMAM', name: 'DMAM Hazardous Facility', loc: 'Specialized Industrial Zone', services: ['S-HAZ'] }
        ];

        for (const f of facilities) {
            await query(`INSERT INTO facilities (facility_id, name, location_url, accepted_services, status) VALUES ($1, $2, $3, $4, 'ACTIVE')`,
                [f.id, f.name, f.loc, JSON.stringify(f.services)]);
        }

        // 5. Assets (Vehicles & Drivers)
        console.log('[6/9] Deploying Logistics Fleet...');
        const vehicleTypes = {
            'S-CONC': 'Concrete Mixer',
            'S-SEWG': 'Septic Tanker',
            'S-HAZ': 'Hazardous Waste Truck'
        };

        for (let i = 1; i <= 30; i++) {
            const vId = `V-${100 + i}`;
            const sId = services[i % services.length].id;
            await query(`INSERT INTO vehicles (vehicle_id, plate_no, vehicle_type, status, ownership_type) VALUES ($1, $2, $3, 'ACTIVE', 'INTERNAL')`,
                [vId, `${1000 + i} GCM`, vehicleTypes[sId]]);
            
            const dId = `D-${100 + i}`;
            const uId = `U-${dId}`;
            await query(`INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
                [uId, `Driver ${i}`, `d${i}@gcm-fleet.com`, '123', 'DRIVER']);

            await query(`INSERT INTO drivers (driver_id, name, phone, status, ownership_type, vehicle_id, user_id) VALUES ($1, $2, $3, 'ACTIVE', 'INTERNAL', $4, $5)`,
                [dId, `Driver ${i}`, `050${1000000 + i}`, vId, uId]);
        }

        // 6. Assets (Containers & Tanks)
        console.log('[7/9] Placing Inventory Assets (Containers/Tanks)...');
        for (const p of projects) {
            for (let i = 1; i <= 5; i++) {
                await query(`INSERT INTO containers (container_id, code, name, status, project_id) VALUES ($1, $2, $3, 'ACTIVE', $4)`,
                    [`C-${p.id}-${i}`, `CON-${p.id}-${i}`, `Container ${i}`, p.id]);
                await query(`INSERT INTO tanks (tank_id, code, name, status, project_id) VALUES ($1, $2, $3, 'ACTIVE', $4)`,
                    [`T-${p.id}-${i}`, `TNK-${p.id}-${i}`, `Tank ${i}`, p.id]);
            }
        }

        // 7. Suppliers
        console.log('[8/9] Onboarding Key Suppliers...');
        const suppliers = [
            { id: 'SUP-READY', name: 'Saudi Ready Mix', cat: 'CONCRETE' },
            { id: 'SUP-ENV', name: 'Environment First', cat: 'HAZMAT' },
            { id: 'SUP-TRN', name: 'Global Transport', cat: 'VEHICLES' }
        ];
        for (const s of suppliers) {
            await query(`INSERT INTO suppliers (supplier_id, name, category, status) VALUES ($1, $2, $3, 'ACTIVE')`,
                [s.id, s.name, s.cat]);
            await query(`INSERT INTO users (id, name, email, password, role, supplier_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                [`U-${s.id}`, `${s.name} Rep`, `rep@${s.id.toLowerCase()}.com`, '123', 'DATA_ENTRY', s.id]);
        }

        // 8. Trips (The Big One: 50 per project)
        console.log('[9/9] Manifesting 550+ Industrial Trips (Last 60 Days)...');
        let tripCounter = 0;
        const startTimestamp = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 days ago

        const serviceToFacility = {
            'S-SEWG': 'F-NWC',
            'S-CONC': 'F-AKAM',
            'S-HAZ': 'F-DMAM'
        };

        for (const p of projects) {
            console.log(`  -> Seeding project: ${p.name}`);
            for (let i = 1; i <= 50; i++) {
                tripCounter++;
                const tId = `T-${100000 + tripCounter}`;
                const sId = services[i % services.length].id;
                const vId = `V-${100 + (tripCounter % 30 + 1)}`;
                const dId = `D-${100 + (tripCounter % 30 + 1)}`;
                const fId = serviceToFacility[sId];
                
                const randomTime = startTimestamp + Math.floor(Math.random() * (Date.now() - startTimestamp));
                const tripDate = new Date(randomTime).toISOString().split('T')[0];
                const tripTime = new Date(randomTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const quantity = (Math.random() * 20 + 5).toFixed(2);
                const unit = (sId === 'S-CONC') ? 'm3' : 'TON';

                await query(`INSERT INTO trips (
                        trip_id, project_id, company_id, service_id, facility_id, date, time, 
                        quantity, unit, vehicle_id, driver_id, status, notes,
                        waste_manifest_no, delivery_note_no, manifest_file, delivery_note_file, 
                        is_manifest_generated, is_delivery_note_generated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, true)`,
                    [
                        tId, p.id, p.cid, sId, fId, tripDate, tripTime, 
                        quantity, unit, vId, dId, 'COMPLETED', `Auto-seeded realistic trip ${i}`,
                        `M-RSG-${20000 + tripCounter}`, `DN-RSG-${20000 + tripCounter}`,
                        `/uploads/manifests/dummy.pdf`, `/uploads/dns/dummy.pdf`
                    ]);
            }
        }

        console.log(`--- SEEDING COMPLETE: Created ${tripCounter} trips across ${projects.length} projects ---`);
        process.exit(0);
    } catch (e) {
        console.error('SEEDING FAILED:', e);
        process.exit(1);
    }
};

runSeed();
