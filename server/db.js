import mysql from 'mysql2/promise';
import 'dotenv/config';

// Create connection pool configuration
function getPoolConfig() {
  const isCloudHost = process.env.MYSQL_HOST && process.env.MYSQL_HOST !== 'localhost' && process.env.MYSQL_HOST !== '127.0.0.1';
  const useSsl = process.env.MYSQL_SSL === 'true' || isCloudHost;

  if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    const uri = process.env.MYSQL_URL || process.env.DATABASE_URL;
    return {
      uri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: process.env.MYSQL_SSL === 'false' ? undefined : { rejectUnauthorized: false }
    };
  }

  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'eduinspire',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: useSsl && process.env.MYSQL_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
  };
}

let db = mysql.createPool(getPoolConfig());

// Random 6-char access code generator
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function initDatabase() {
  try {
    // 1. Ensure database exists (for local MySQL instances)
    if (!process.env.MYSQL_URL && !process.env.DATABASE_URL) {
      try {
        const isCloudHost = process.env.MYSQL_HOST && process.env.MYSQL_HOST !== 'localhost' && process.env.MYSQL_HOST !== '127.0.0.1';
        const tempConnection = await mysql.createConnection({
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          ssl: isCloudHost && process.env.MYSQL_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
        });
        const dbName = process.env.MYSQL_DATABASE || 'eduinspire';
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConnection.end();
      } catch (dbCreateErr) {
        console.log('[MySQL Notice] Skipping raw CREATE DATABASE step:', dbCreateErr.message);
      }
    }

    // 2. Re-create pool with database selected
    db = mysql.createPool(getPoolConfig());


    // 3. Create Tables
    // Admins table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Teams table
    await db.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_code VARCHAR(50) UNIQUE NOT NULL,
        team_name VARCHAR(255) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        dept_name VARCHAR(255) NOT NULL,
        faculty_1 VARCHAR(255) NOT NULL,
        faculty_1_email VARCHAR(255) NULL,
        faculty_2 VARCHAR(255) NOT NULL,
        faculty_2_email VARCHAR(255) NULL,
        presentation_order INT UNIQUE NOT NULL,
        presentation_status VARCHAR(50) DEFAULT 'NOT_STARTED'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist if table was already created
    try { await db.query(`ALTER TABLE teams ADD COLUMN faculty_1_email VARCHAR(255) NULL;`); } catch (e) {}
    try { await db.query(`ALTER TABLE teams ADD COLUMN faculty_2_email VARCHAR(255) NULL;`); } catch (e) {}


    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        access_code VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        team_id INT NULL,
        otp_code VARCHAR(10) NULL,
        otp_expiry DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Event state table
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_state (
        id INT PRIMARY KEY,
        current_team_id INT NULL,
        evaluation_status VARCHAR(50) DEFAULT 'CLOSED',
        timer_seconds INT DEFAULT 420,
        timer_running INT DEFAULT 0,
        timer_remaining INT DEFAULT 420,
        timer_started_at BIGINT NULL,
        results_finalized INT DEFAULT 0,
        voting_start_time DATETIME NULL,
        voting_end_time DATETIME NULL,
        voting_timer_seconds INT DEFAULT 1200,
        voting_timer_running INT DEFAULT 0,
        voting_timer_remaining INT DEFAULT 1200,
        voting_timer_started_at BIGINT NULL,
        FOREIGN KEY (current_team_id) REFERENCES teams (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Judge Scores table
    await db.query(`
      CREATE TABLE IF NOT EXISTS judge_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judge_id VARCHAR(50) NOT NULL,
        team_id INT NOT NULL,
        student_impact INT NOT NULL DEFAULT 0,
        faculty_impact INT NOT NULL DEFAULT 0,
        admin_impact INT NOT NULL DEFAULT 0,
        social_impact INT NOT NULL DEFAULT 0,
        innovation INT NOT NULL DEFAULT 0,
        implementation INT NOT NULL DEFAULT 0,
        outcomes INT NOT NULL DEFAULT 0,
        replicability INT NOT NULL DEFAULT 0,
        total_score INT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
        UNIQUE KEY unique_judge_team (judge_id, team_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Audience & Participant Evaluations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS audience_evaluations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id VARCHAR(100) NOT NULL,
        voter_role VARCHAR(50) NOT NULL,
        voter_team_id INT NULL,
        team_id INT NOT NULL,
        student_impact INT NOT NULL DEFAULT 0,
        faculty_impact INT NOT NULL DEFAULT 0,
        admin_impact INT NOT NULL DEFAULT 0,
        social_impact INT NOT NULL DEFAULT 0,
        innovation INT NOT NULL DEFAULT 0,
        implementation INT NOT NULL DEFAULT 0,
        outcomes INT NOT NULL DEFAULT 0,
        replicability INT NOT NULL DEFAULT 0,
        total_score INT NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'VALID',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
        FOREIGN KEY (voter_team_id) REFERENCES teams (id) ON DELETE SET NULL,
        UNIQUE KEY unique_voter_team (voter_id, team_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Manual Rankings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS manual_rankings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ranking_type VARCHAR(50) NOT NULL,
        team_id INT NOT NULL,
        rank_position INT NOT NULL,
        is_finalized INT DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
        UNIQUE KEY unique_manual_ranking (ranking_type, team_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Manual Scores table
    await db.query(`
      CREATE TABLE IF NOT EXISTS manual_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ranking_type VARCHAR(50) NOT NULL,
        team_id INT NOT NULL,
        score DOUBLE NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
        UNIQUE KEY unique_manual_score (ranking_type, team_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed Data
    await seedDataIfEmpty();

    console.log('[MySQL] Database & Tables initialized successfully.');
  } catch (err) {
    console.error('[MySQL Error] Failed to initialize database:', err);
    throw err;
  }
}

async function seedDataIfEmpty() {
  try {
    const [teamRows] = await db.query('SELECT COUNT(*) as count FROM teams');
    const teamCount = teamRows[0]?.count || 0;

    if (teamCount === 0) {
      console.log('Seeding initial MySQL demo data (40 teams, 80 participants, 50 audience, judges, admin)...');

      // Seed Admin
      await db.query('INSERT IGNORE INTO admins (username, password) VALUES (?, ?)', ['admin', 'admin123']);
      await db.query('INSERT IGNORE INTO users (user_id, access_code, role) VALUES (?, ?, ?)', ['admin', 'admin123', 'ADMIN']);

      // Seed Judge Portal account
      await db.query('INSERT IGNORE INTO users (user_id, access_code, role) VALUES (?, ?, ?)', ['JUDGEPORTAL', 'JKEY2026', 'JUDGE']);

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

      let participantIndex = 1;

      for (let i = 1; i <= 40; i++) {
        const code = `T${i.toString().padStart(2, '0')}`;
        const title = projectTitles[i - 1];
        const college = colleges[i - 1];
        const dept = departments[(i - 1) % departments.length];

        const f1 = `${facultyFirstNames[(i * 2) % facultyFirstNames.length]} ${facultyLastNames[(i * 3) % facultyLastNames.length]}`;
        const f2 = `${facultyFirstNames[(i * 2 + 1) % facultyFirstNames.length]} ${facultyLastNames[(i * 3 + 1) % facultyLastNames.length]}`;

        const [insertRes] = await db.query(`
          INSERT INTO teams (team_code, team_name, college_name, dept_name, faculty_1, faculty_2, presentation_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [code, title, college, dept, f1, f2, i]);

        const teamId = insertRes.insertId;

        // Seed 2 Faculty Participants for this team
        const p1Id = `P${participantIndex.toString().padStart(3, '0')}`;
        participantIndex++;
        const p2Id = `P${participantIndex.toString().padStart(3, '0')}`;
        participantIndex++;

        await db.query('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, ?)', [p1Id, generateAccessCode(), 'PARTICIPANT', teamId]);
        await db.query('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, ?)', [p2Id, generateAccessCode(), 'PARTICIPANT', teamId]);
      }

      // Seed 50 Audience Voters (A001 to A050)
      for (let a = 1; a <= 50; a++) {
        const aId = `A${a.toString().padStart(3, '0')}`;
        await db.query('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, NULL)', [aId, generateAccessCode(), 'AUDIENCE']);
      }

      // Seed Event State
      await db.query(`
        INSERT INTO event_state (id, current_team_id, evaluation_status, timer_seconds, timer_running, timer_remaining, results_finalized)
        VALUES (1, 1, 'CLOSED', 420, 0, 420, 0)
        ON DUPLICATE KEY UPDATE id = 1
      `);

      console.log('MySQL Database seeded successfully with 40 teams, 80 participants, 50 audience credentials!');
    }
  } catch (err) {
    console.error('[MySQL Error] Error in seedDataIfEmpty:', err);
  }
}

export default db;
