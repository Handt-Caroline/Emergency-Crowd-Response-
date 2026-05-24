-- ══════════════════════════════════════════════════════════════════════
--- ══════════════════════════════════════════════════════════════════════
-- CLEAN DATABASE SETUP (PAYMENT POLICY REMOVED)
-- ══════════════════════════════════════════════════════════════════════

DROP DATABASE IF EXISTS ecrs;
CREATE DATABASE ecrs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecrs;

-- ── TABLE 1: institutions ─────────────────────────────────────────────
CREATE TABLE institutions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  type             ENUM('hospital','gendarmerie','fire_station') NOT NULL DEFAULT 'hospital',
  email            VARCHAR(150) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  address          VARCHAR(255) DEFAULT NULL,
  phone            VARCHAR(30)  DEFAULT NULL,
  latitude         DECIMAL(10,8) NOT NULL,
  longitude        DECIMAL(11,8) NOT NULL,
  location         POINT NOT NULL SRID 4326,
  equipment        JSON NOT NULL,
  personnel        JSON NOT NULL,
  total_capacity   INT NOT NULL DEFAULT 0,
  free_capacity    INT NOT NULL DEFAULT 0,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  status           ENUM('pending','approved','suspended') NOT NULL DEFAULT 'pending',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SPATIAL INDEX(location)
);

-- ── TABLE 2: alerts ───────────────────────────────────────────────────
CREATE TABLE alerts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  device_id        VARCHAR(100) NOT NULL,
  bystander_name   VARCHAR(100),
  bystander_phone  VARCHAR(30),
  emergency_type   ENUM('MEDICAL','FIRE','SECURITY') NOT NULL,
  situation        VARCHAR(60)  NOT NULL,
  medical_category VARCHAR(60)  NOT NULL,
  victims_count    ENUM('ONE','TWO','MANY','UNKNOWN') DEFAULT 'UNKNOWN',
  photo_url        VARCHAR(255),
  latitude         DECIMAL(10,8) NOT NULL,
  longitude        DECIMAL(11,8) NOT NULL,
  report_count     INT DEFAULT 1,
  confidence       ENUM('LOW','MEDIUM','HIGH') DEFAULT 'LOW',
  status           ENUM('PENDING','DISPATCHED','CONFIRMED','IN_PROGRESS','RESOLVED','FAILED')
                   DEFAULT 'PENDING',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at      DATETIME
);

-- ── TABLE 3: assignments ──────────────────────────────────────────────
CREATE TABLE assignments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  alert_id         INT NOT NULL,
  institution_id   INT NOT NULL,
  assigned_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at     DATETIME,
  declined_at      DATETIME,
  FOREIGN KEY (alert_id) REFERENCES alerts(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- ── TABLE 4: emergency_cases ──────────────────────────────────────────
CREATE TABLE emergency_cases (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  alert_id         INT NOT NULL,
  institution_id   INT NOT NULL,
  outcome          ENUM('TREATED','FALSE_ALARM','DECEASED','TRANSFERRED') NOT NULL,
  notes            TEXT,
  closed_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alerts(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- ── TABLE 5: admins ───────────────────────────────────────────────────
CREATE TABLE admins (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── ADMIN SEED ────────────────────────────────────────────────────────
INSERT INTO admins (name, email, password_hash) VALUES (
  'Ondoua Marie',
  'marie@ecrs.cm',
  '$2b$10$2/csJQzomRz/ovwrNEa/0.ZJEkIdGffUDrwafP0WrGw1S/YDCMgKy'
);

-- ── HOSPITAL SEED (ALL CLEAN, NO PAYMENT POLICY) ──────────────────────

-- ── ALL 15 HOSPITALS (CLEAN, NO PAYMENT POLICY) ──────────────────────

INSERT INTO institutions (
name,type,email,password_hash,address,phone,
latitude,longitude,location,
equipment,personnel,
total_capacity,free_capacity,is_available,status
) VALUES

-- 1
('Hopital Central de Yaounde','hospital','central@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Centre Ville','+237222234040',
3.867067,11.5176,ST_GeomFromText('POINT(11.5176 3.867067)',4326),
'["DEFIBRILLATOR","OXYGEN","ICU_BEDS","ECG_MACHINE","OPERATING_THEATRE","BLOOD_BANK","XRAY","CT_SCAN","BURNS_UNIT","MATERNITY_WARD","PAEDIATRIC_WARD","EMERGENCY_BAY","VENTILATOR","MRI"]',
'["CARDIOLOGIST","SURGEON","ANAESTHESIOLOGIST","NEUROLOGIST","RESUSCITATION_NURSE","GENERAL_DOCTOR","PAEDIATRICIAN","OBSTETRICIAN","MIDWIFE","BURNS_SPECIALIST"]',
120,28,TRUE,'approved'),

-- 2
('Hopital General de Yaounde','hospital','general@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Messa','+237222232188',
3.878,11.506,ST_GeomFromText('POINT(11.506 3.878)',4326),
'["DEFIBRILLATOR","OXYGEN","ICU_BEDS","ECG_MACHINE","OPERATING_THEATRE","BLOOD_BANK","XRAY","CT_SCAN","EMERGENCY_BAY","VENTILATOR","PAEDIATRIC_WARD"]',
'["CARDIOLOGIST","SURGEON","ANAESTHESIOLOGIST","NEUROLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE","PAEDIATRICIAN"]',
100,21,TRUE,'approved'),

-- 3
('Hopital Gyneco-Obstetrique et Pediatrique','hospital','hgoped@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Bastos','+237222200799',
3.875,11.522,ST_GeomFromText('POINT(11.522 3.875)',4326),
'["OXYGEN","ICU_BEDS","MATERNITY_WARD","PAEDIATRIC_WARD","EMERGENCY_BAY","DEFIBRILLATOR","VENTILATOR","XRAY"]',
'["OBSTETRICIAN","MIDWIFE","PAEDIATRICIAN","RESUSCITATION_NURSE","GENERAL_DOCTOR","ANAESTHESIOLOGIST"]',
80,18,TRUE,'approved'),

-- 4
('CHU Yaounde','hospital','chu@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Ngoa-Ekelle','+237222312853',
3.86,11.5,ST_GeomFromText('POINT(11.5 3.86)',4326),
'["OPERATING_THEATRE","BLOOD_BANK","XRAY","CT_SCAN","BURNS_UNIT","ICU_BEDS","OXYGEN","DEFIBRILLATOR","EMERGENCY_BAY","VENTILATOR","ECG_MACHINE"]',
'["SURGEON","ANAESTHESIOLOGIST","BURNS_SPECIALIST","NEUROLOGIST","CARDIOLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
90,15,TRUE,'approved'),

-- 5
('Clinique Cathedrale','hospital','cathedrale@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Centre','+237222221489',
3.865,11.522,ST_GeomFromText('POINT(11.522 3.865)',4326),
'["ECG_MACHINE","DEFIBRILLATOR","OXYGEN","ICU_BEDS","XRAY","EMERGENCY_BAY","VENTILATOR"]',
'["CARDIOLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE","ANAESTHESIOLOGIST"]',
35,9,TRUE,'approved'),

-- 6
('Clinique Nlongkak','hospital','nlongkak@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Nlongkak','+237222208945',
3.881,11.515,ST_GeomFromText('POINT(11.515 3.881)',4326),
'["OPERATING_THEATRE","BLOOD_BANK","XRAY","OXYGEN","EMERGENCY_BAY","ICU_BEDS","DEFIBRILLATOR"]',
'["SURGEON","ANAESTHESIOLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
40,11,TRUE,'approved'),

-- 7
('Hopital Biyem-Assi','hospital','biyemassi@ecrs.cm','HOSPITAL_HASH_HERE',
'Biyem-Assi','+237222313821',
3.848,11.493,ST_GeomFromText('POINT(11.493 3.848)',4326),
'["OXYGEN","XRAY","OPERATING_THEATRE","BLOOD_BANK","EMERGENCY_BAY","DEFIBRILLATOR","ECG_MACHINE"]',
'["SURGEON","GENERAL_DOCTOR","ANAESTHESIOLOGIST","CARDIOLOGIST"]',
45,13,TRUE,'approved'),

-- 8
('Cite Verte Medical','hospital','citeverte@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Cite Verte','+237222215678',
3.872,11.501,ST_GeomFromText('POINT(11.501 3.872)',4326),
'["OXYGEN","DEFIBRILLATOR","ECG_MACHINE","EMERGENCY_BAY","XRAY","ICU_BEDS"]',
'["CARDIOLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
25,7,TRUE,'approved'),

-- 9
('Clinique Ngousso','hospital','ngousso@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Ngousso','+237222214317',
3.881,11.528,ST_GeomFromText('POINT(11.528 3.881)',4326),
'["OPERATING_THEATRE","BLOOD_BANK","XRAY","OXYGEN","EMERGENCY_BAY","DEFIBRILLATOR"]',
'["SURGEON","GENERAL_DOCTOR","ANAESTHESIOLOGIST"]',
30,8,TRUE,'approved'),

-- 10
('Hopital Nkolndongo','hospital','nkolndongo@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Nkolndongo','+237222310972',
3.842,11.518,ST_GeomFromText('POINT(11.518 3.842)',4326),
'["OXYGEN","PAEDIATRIC_WARD","EMERGENCY_BAY","XRAY","DEFIBRILLATOR","MATERNITY_WARD"]',
'["PAEDIATRICIAN","GENERAL_DOCTOR","MIDWIFE","OBSTETRICIAN"]',
35,10,TRUE,'approved'),

-- 11
('Polyclinique Bastos','hospital','bastos@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Bastos','+237222210356',
3.879,11.517,ST_GeomFromText('POINT(11.517 3.879)',4326),
'["OXYGEN","EMERGENCY_BAY","ECG_MACHINE","DEFIBRILLATOR","ICU_BEDS","XRAY"]',
'["CARDIOLOGIST","GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
20,6,TRUE,'approved'),

-- 12
('Clinique Avenir','hospital','avenir@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Mvog-Ada','+237222226734',
3.868,11.535,ST_GeomFromText('POINT(11.535 3.868)',4326),
'["OXYGEN","MATERNITY_WARD","PAEDIATRIC_WARD","EMERGENCY_BAY","DEFIBRILLATOR"]',
'["MIDWIFE","OBSTETRICIAN","PAEDIATRICIAN","GENERAL_DOCTOR"]',
20,5,TRUE,'approved'),

-- 13
('Centre Melen','hospital','melen@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Melen','+237222223471',
3.861,11.529,ST_GeomFromText('POINT(11.529 3.861)',4326),
'["OXYGEN","EMERGENCY_BAY","XRAY"]',
'["GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
15,4,TRUE,'approved'),

-- 14
('Dispensaire Nkomo','hospital','nkomo@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Nkomo','+237222301188',
3.835,11.487,ST_GeomFromText('POINT(11.487 3.835)',4326),
'["OXYGEN","EMERGENCY_BAY"]',
'["GENERAL_DOCTOR"]',
10,3,TRUE,'approved'),

-- 15
('Centre Ekounou','hospital','ekounou@ecrs.cm','$2b$10$BU9uWgH.FZSAOSg/kCKcfeEQD8QIqt/r8B4L2OvmQmWxnYYhtaV4W',
'Ekounou','+237222324560',
3.852,11.539,ST_GeomFromText('POINT(11.539 3.852)',4326),
'["OXYGEN","EMERGENCY_BAY","DEFIBRILLATOR"]',
'["GENERAL_DOCTOR","RESUSCITATION_NURSE"]',
12,4,TRUE,'approved');

-- ── VERIFY ───────────────────────────────────────────────────────────
SHOW TABLES;

SELECT id,name,status,total_capacity,free_capacity FROM institutions;
SELECT id,name,email FROM admins;
-- ── ADDITIONAL ADMINS (all 5 team members) ────────────────────────────
-- Default password for all: Ecrs2026!  (ask each member to change after first login)
INSERT INTO admins (name, email, password_hash) VALUES
  ('Bisseck Handt Damarise', 'bisseck@ecrs.cm', '$2b$10$vm79hRHHzRDg0Kxz/Cb9T.SzfE67OXsZkF5Z0jvKvhR1BKwc79Ybu'),
  ('Kankeu Tene Charles',    'charles@ecrs.cm', '$2b$10$z1D9VwzeRdcPm4F1VjRIl.wnT/2Nzlyy9gGMHOnzMIQZ37oXJfAQq'),
  ('Fouda Mvondo Raoul',     'raoul@ecrs.cm',   '$2b$10$BziRB5/2Rbd.qT63dwPSB.Faxxo7k3jpdviL4DuAnv2H5DbE3yT0S'),
  ('Christ Smith',           'christ@ecrs.cm',  '$2b$10$ke.ayDtKMIyqQgNmwG73nulzHe3hmaAHCf8wfuxCgBGfNlqHMj5rO');

-- ── VERIFY ALL ADMINS ─────────────────────────────────────────────────
SELECT id, name, email FROM admins;
