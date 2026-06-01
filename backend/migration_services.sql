-- GCM Service Migration Script
-- Deleting old services and adding the new 3 main categories with sub-services

-- 1. Clear old data (optional, but requested by user)
DELETE FROM services WHERE service_id IN ('SERV-GEN-01', 'SERV-HAZ-02', 'SERV-REC-03');

-- 2. Add Main Categories
INSERT INTO services (service_id, service_name, service_description) VALUES ('CAT-NH', 'Non-Hazardous waste', 'Main Category') ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name;
INSERT INTO services (service_id, service_name, service_description) VALUES ('CAT-H', 'Hazardous waste', 'Main Category') ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name;
INSERT INTO services (service_id, service_name, service_description) VALUES ('CAT-W', 'Supplying water', 'Main Category') ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name;

-- 3. Add Non-Hazardous Sub-Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('NH-01', 'Paper', 'Non-Hazardous', 'CAT-NH'),
('NH-02', 'Cardboard', 'Non-Hazardous', 'CAT-NH'),
('NH-03', 'Wood', 'Non-Hazardous', 'CAT-NH'),
('NH-04', 'Plastic', 'Non-Hazardous', 'CAT-NH'),
('NH-05', 'Metal / Steel', 'Non-Hazardous', 'CAT-NH'),
('NH-06', 'Concrete', 'Non-Hazardous', 'CAT-NH'),
('NH-07', 'Food Waste', 'Non-Hazardous', 'CAT-NH'),
('NH-08', 'General Waste', 'Non-Hazardous', 'CAT-NH'),
('NH-09', 'Asphalt', 'Non-Hazardous', 'CAT-NH'),
('NH-10', 'Glass', 'Non-Hazardous', 'CAT-NH'),
('NH-11', 'Excavated Material', 'Non-Hazardous', 'CAT-NH'),
('NH-12', 'Electronic (specify)', 'Non-Hazardous', 'CAT-NH')
ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name, parent_id = EXCLUDED.parent_id;

-- 4. Add Hazardous Sub-Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('H-01', 'Oils / Fuels / Oily Water', 'Hazardous', 'CAT-H'),
('H-02', 'Tires', 'Hazardous', 'CAT-H'),
('H-03', 'Concrete Wash Water', 'Hazardous', 'CAT-H'),
('H-04', 'Sewage', 'Hazardous', 'CAT-H'),
('H-05', 'Contaminated Material', 'Hazardous', 'CAT-H'),
('H-06', 'Contaminated Soil', 'Hazardous', 'CAT-H'),
('H-07', 'Rags / Drums / Filters', 'Hazardous', 'CAT-H'),
('H-08', 'Batteries', 'Hazardous', 'CAT-H'),
('H-09', 'Asbestos', 'Hazardous', 'CAT-H'),
('H-10', 'Medical', 'Hazardous', 'CAT-H'),
('H-11', 'Electronic (specify)', 'Hazardous', 'CAT-H'),
('H-12', 'Other (    )', 'Hazardous', 'CAT-H')
ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name, parent_id = EXCLUDED.parent_id;

-- 5. Add Supplying Water Sub-Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('W-01', 'Sweet water', 'Supplying water', 'CAT-W'),
('W-02', 'Drinking water', 'Supplying water', 'CAT-W'),
('W-03', 'Dust control', 'Supplying water', 'CAT-W')
ON CONFLICT (service_id) DO UPDATE SET service_name = EXCLUDED.service_name, parent_id = EXCLUDED.parent_id;
