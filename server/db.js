import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Random 6-char access code generator
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function initDatabase() {
  // 1. Admins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // 2. Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_code TEXT UNIQUE NOT NULL,
      team_name TEXT NOT NULL,
      college_name TEXT NOT NULL,
      dept_name TEXT NOT NULL,
      faculty_1 TEXT NOT NULL,
      faculty_2 TEXT NOT NULL,
      presentation_order INTEGER UNIQUE NOT NULL,
      presentation_status TEXT DEFAULT 'NOT_STARTED'
    );
  `);

  // 3. Users table (Participants, Audience, Judges)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      access_code TEXT NOT NULL,
      role TEXT NOT NULL, -- 'ADMIN', 'JUDGE', 'PARTICIPANT', 'AUDIENCE'
      team_id INTEGER,
      otp_code TEXT,
      otp_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
    );
  `);

  // 4. Event state table (Singleton control)
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_team_id INTEGER,
      evaluation_status TEXT DEFAULT 'CLOSED', -- 'OPEN', 'CLOSED'
      timer_seconds INTEGER DEFAULT 420,
      timer_running INTEGER DEFAULT 0,
      timer_remaining INTEGER DEFAULT 420,
      timer_started_at INTEGER,
      results_finalized INTEGER DEFAULT 0,
      FOREIGN KEY (current_team_id) REFERENCES teams (id)
    );
  `);

  try { db.exec('ALTER TABLE event_state ADD COLUMN timer_started_at INTEGER'); } catch (e) {}
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_start_time DATETIME'); } catch (e) {}
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_end_time DATETIME'); } catch (e) {}

  // 5. Judge Scores table
  db.exec(`
    CREATE TABLE IF NOT EXISTS judge_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id TEXT NOT NULL, -- 'Judge 1' or 'Judge 2'
      team_id INTEGER NOT NULL,
      student_impact INTEGER NOT NULL CHECK (student_impact >= 0 AND student_impact <= 20),
      faculty_impact INTEGER NOT NULL CHECK (faculty_impact >= 0 AND faculty_impact <= 10),
      admin_impact INTEGER NOT NULL CHECK (admin_impact >= 0 AND admin_impact <= 10),
      social_impact INTEGER NOT NULL CHECK (social_impact >= 0 AND social_impact <= 10),
      innovation INTEGER NOT NULL CHECK (innovation >= 0 AND innovation <= 20),
      implementation INTEGER NOT NULL CHECK (implementation >= 0 AND implementation <= 15),
      outcomes INTEGER NOT NULL CHECK (outcomes >= 0 AND outcomes <= 10),
      replicability INTEGER NOT NULL CHECK (replicability >= 0 AND replicability <= 5),
      total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      UNIQUE(judge_id, team_id)
    );
  `);

  // 6. Audience & Participant Evaluations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audience_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT NOT NULL,
      voter_role TEXT NOT NULL, -- 'PARTICIPANT' or 'AUDIENCE'
      voter_team_id INTEGER,
      team_id INTEGER NOT NULL,
      student_impact INTEGER NOT NULL CHECK (student_impact >= 0 AND student_impact <= 20),
      faculty_impact INTEGER NOT NULL CHECK (faculty_impact >= 0 AND faculty_impact <= 10),
      admin_impact INTEGER NOT NULL CHECK (admin_impact >= 0 AND admin_impact <= 10),
      social_impact INTEGER NOT NULL CHECK (social_impact >= 0 AND social_impact <= 10),
      innovation INTEGER NOT NULL CHECK (innovation >= 0 AND innovation <= 20),
      implementation INTEGER NOT NULL CHECK (implementation >= 0 AND implementation <= 15),
      outcomes INTEGER NOT NULL CHECK (outcomes >= 0 AND outcomes <= 10),
      replicability INTEGER NOT NULL CHECK (replicability >= 0 AND replicability <= 5),
      total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
      status TEXT DEFAULT 'VALID',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (voter_team_id) REFERENCES teams (id) ON DELETE SET NULL,
      UNIQUE(voter_id, team_id)
    );
  `);

  try { db.exec('ALTER TABLE audience_evaluations ADD COLUMN status TEXT DEFAULT "VALID"'); } catch (e) {}

  // Add voting timer fields to event_state
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_timer_seconds INTEGER DEFAULT 1200'); } catch (e) {}
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_timer_running INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_timer_remaining INTEGER DEFAULT 1200'); } catch (e) {}
  try { db.exec('ALTER TABLE event_state ADD COLUMN voting_timer_started_at INTEGER'); } catch (e) {}

  // 7. Manual Rankings override table
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ranking_type TEXT NOT NULL, -- 'JUDGE' or 'AUDIENCE'
      team_id INTEGER NOT NULL,
      rank_position INTEGER NOT NULL,
      is_finalized INTEGER DEFAULT 0,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      UNIQUE(ranking_type, team_id)
    );
  `);

  // 8. Manual Scores table (for Admin to edit scores directly)
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ranking_type TEXT NOT NULL, -- 'JUDGE' or 'AUDIENCE'
      team_id INTEGER NOT NULL,
      score REAL NOT NULL,
      UNIQUE(ranking_type, team_id),
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    );
  `);

  seedDataIfEmpty();
}

function seedDataIfEmpty() {
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;

  if (teamCount === 0) {
    console.log('Seeding initial demo data for 40 teams, 80 participants, 50 audience voters, 2 judges, and 1 admin...');

    // Seed Admin
    db.prepare('INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)').run('admin', 'admin123');
    db.prepare('INSERT OR IGNORE INTO users (user_id, access_code, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'ADMIN');

    // Seed Judge Portal account
    db.prepare('INSERT OR IGNORE INTO users (user_id, access_code, role) VALUES (?, ?, ?)').run('JUDGEPORTAL', 'JKEY2026', 'JUDGE');

    // 40 realistic colleges and departments
    const colleges = [
      "IIT Bombay", "Anna University, Chennai", "BITS Pilani", "Delhi Technological University",
      "COEP Technological University, Pune", "RV College of Engineering, Bengaluru", "NIT Trichy", "Jadavpur University, Kolkata",
      "Vellore Institute of Technology", "SRM Institute of Science & Technology", "IIT Madras", "Thapar Institute of Engg & Tech",
      "Manipal Institute of Technology", "PSG College of Technology, Coimbatore", "BMS College of Engineering", "IIT Roorkee",
      "National Institute of Technology Surathkal", "College of Engineering Guindy", "SSN College of Engineering", "Kalinga Institute of Industrial Technology",
      "Amrita Vishwa Vidyapeetham", "IIT Kharagpur", "VJTI Mumbai", "PES University Bengaluru",
      "IIIT Hyderabad", "PEC Chandigarh", "MS Ramaiah Institute of Technology", "Walchand College of Engineering, Sangli",
      "Harcourt Butler Technical University", "Motilal Nehru NIT Allahabad", "National Institute of Technology Warangal", "Sardar Patel College of Engineering", "Symbiosis Institute of Technology", "LNM Institute of Information Technology",
      "Government College of Technology Coimbatore", "MIT World Peace University Pune", "Vishwakarma Institute of Technology Pune",
      "Government Engineering College Thrissur", "Savitribai Phule Pune University Campus", "VNR Vignana Jyothi Institute of Tech"
    ];

    const departments = [
      "Computer Science & Engineering", "Information Technology", "Artificial Intelligence & Data Science",
      "Electronics & Communication Engg", "Electrical & Electronics Engg", "Mechanical Engineering",
      "Biotechnology & Bio-Engineering", "Robotics & Automation", "Cyber Security & Digital Forensics",
      "Civil & Structural Engineering"
    ];

    const projectTitles = [
      "AI-Driven Real-time Adaptive Learning & Micro-Assessment Platform",
      "Solar Microgrid Optimization using IoT Edge Nodes for Remote Campuses",
      "Early Diagnostic Screening of Diabetic Retinopathy via Mobile Vision AI",
      "Blockchain-Verified Decentralized Academic Credential System",
      "Autonomous Campus Shuttle Shuttle Dispatch using LiDAR & Deep RL",
      "Smart Hydroponics & Precision Vertical Farming Framework",
      "Low-Cost Portable Tele-ECG & Patient Health Monitoring Hub",
      "Non-Invasive Continuous Blood Glucose Assessment Device",
      "Intelligent Waste Segregation & Plastic Recycling Automation",
      "Zero-Trust Federated Learning Protocol for Distributed Health Records",
      "Augmented Reality Interactive Surgical Training Simulator",
      "Energy Efficient HVAC Control using Neural Predictive Models",
      "Smart Water Quality Assessment Network using Chemical Sensors & LoRaWAN",
      "Drone-Based Crop Health Inspection & Precision Pesticide Sprayer",
      "Natural Language Processing for Indian Regional Dialect Translation",
      "Automated Braille Text Converter & Tactile E-Reader for Visually Impaired",
      "Deep Learning Framework for Real-time Structural Health Monitoring",
      "Gamified STEM Learning Module for Primary Rural Education",
      "Cyber Threat Intelligence & Automated Anomaly Detection Engine",
      "Solar Thermal Refrigeration Unit for Rural Vaccine Storage",
      "Smart Traffic Signal Preemption System for Emergency Ambulances",
      "Bio-Degradable Packaging Material Synthesized from Agricultural Residue",
      "EEG-Controlled Brain-Computer Interface for Assistive Prosthetics",
      "Autonomous Underwater Vehicle for Micro-Plastic Detection",
      "Quantum-Resistant Cryptographic Key Exchange for Financial Nodes",
      "Voice-Guided Conversational AI for Campus Student Grievance Redressal",
      "Smart Grid Fault Location & Self-Healing Distribution Matrix",
      "AI Assistant for Early Autism Spectrum Screening in Toddlers",
      "Continuous Air Quality Index Sensing Mesh using Machine Learning",
      "IoT Soil Moisture & Automated Smart Irrigation Controller",
      "Virtual Reality Campus Tour & Interactive Laboratory Simulation",
      "Computer Vision Automated Attendance & Classroom Engagement Analyzer",
      "Hybrid Wind-Solar Kinetic Energy Harvester for Highways",
      "Thermal Camera Thermal Screening & Panic Detection in Crowds",
      "Wearable Fall Detection & GPS Beacon Alert System for Elderly",
      "Smart Parking Reservation & Space Optimization App",
      "Micro-Algae Bio-Reactor for Campus Carbon Capture",
      "Machine Learning Based Prediction of Campus Water Consumption",
      "Sub-Surface Pipeline Leakage Detection using Acoustic Sensors",
      "Self-Cleaning Anti-Reflective Hydrophobic Coating for Photovoltaic Panels"
    ];

    const facultyFirstNames = ["Dr. Rajesh", "Prof. Ananya", "Dr. Vikramaditya", "Prof. Meera", "Dr. Suresh", "Prof. Priya", "Dr. Arun", "Prof. Sunita", "Dr. Sanjay", "Prof. Kavita", "Dr. Ramesh", "Prof. Deepa", "Dr. Amit", "Prof. Pooja", "Dr. Nitin", "Prof. Sneha"];
    const facultyLastNames = ["Sharma", "Nair", "Rao", "Deshmukh", "Kulkarni", "Sen", "Verma", "Patel", "Joshi", "Gupta", "Chatterjee", "Reddy", "Iyer", "Banerjee", "Choudhury", "Bhat"];

    const insertTeamStmt = db.prepare(`
      INSERT INTO teams (team_code, team_name, college_name, dept_name, faculty_1, faculty_2, presentation_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUserStmt = db.prepare(`
      INSERT INTO users (user_id, access_code, role, team_id)
      VALUES (?, ?, ?, ?)
    `);

    let participantIndex = 1;

    for (let i = 1; i <= 40; i++) {
      const code = `T${i.toString().padStart(2, '0')}`;
      const title = projectTitles[i - 1];
      const college = colleges[i - 1];
      const dept = departments[(i - 1) % departments.length];

      const f1 = `${facultyFirstNames[(i * 2) % facultyFirstNames.length]} ${facultyLastNames[(i * 3) % facultyLastNames.length]}`;
      const f2 = `${facultyFirstNames[(i * 2 + 1) % facultyFirstNames.length]} ${facultyLastNames[(i * 3 + 1) % facultyLastNames.length]}`;

      const res = insertTeamStmt.run(code, title, college, dept, f1, f2, i);
      const teamId = res.lastInsertRowid;

      // Seed 2 Faculty Participants for this team
      const p1Id = `P${participantIndex.toString().padStart(3, '0')}`;
      participantIndex++;
      const p2Id = `P${participantIndex.toString().padStart(3, '0')}`;
      participantIndex++;

      insertUserStmt.run(p1Id, generateAccessCode(), 'PARTICIPANT', teamId);
      insertUserStmt.run(p2Id, generateAccessCode(), 'PARTICIPANT', teamId);
    }

    // Seed 50 Audience Voters (A001 to A050)
    for (let a = 1; a <= 50; a++) {
      const aId = `A${a.toString().padStart(3, '0')}`;
      insertUserStmt.run(aId, generateAccessCode(), 'AUDIENCE', null);
    }

    // Seed Event State
    db.prepare(`
      INSERT OR REPLACE INTO event_state (id, current_team_id, evaluation_status, timer_seconds, timer_running, timer_remaining, results_finalized)
      VALUES (1, 1, 'CLOSED', 420, 0, 420, 0)
    `).run();

    console.log('Database seeded successfully with 40 teams, 80 participants, 50 audience credentials!');
  }
}

export default db;
