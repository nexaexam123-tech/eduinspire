import express from 'express';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import 'dotenv/config';
import db, { initDatabase } from './db.js';

const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database & tables
initDatabase();

// Helper to generate 6-char access code
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ----------------------------------------------------
// 1. AUTHENTICATION ROUTE
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { userId, accessCode } = req.body;

  if (!userId || !accessCode) {
    return res.status(400).json({ error: 'Email / Username and Password are required.' });
  }

  const cleanId = userId.trim();
  const cleanCode = accessCode.trim();

  // Admin login check (by username)
  const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND password = ?').get(cleanId, cleanCode);
  if (admin) {
    return res.json({
      success: true,
      user: {
        userId: admin.username,
        name: 'Event Administrator',
        role: 'ADMIN',
        teamId: null
      }
    });
  }

  // Judge Portal login check (special case)
  if (cleanId.toUpperCase() === 'JUDGEPORTAL') {
    const judge = db.prepare("SELECT * FROM users WHERE user_id = 'JUDGEPORTAL' AND access_code = ?").get(cleanCode);
    if (judge) {
      return res.json({
        success: true,
        user: {
          userId: 'JUDGEPORTAL',
          name: 'Judge Evaluation Portal',
          role: 'JUDGE',
          teamId: null
        }
      });
    } else {
      return res.status(401).json({ error: 'Invalid Judge Password.' });
    }
  }

  // General Participant / Judge login — by EMAIL or USER_ID + Password
  const user = db.prepare(`
    SELECT u.*, t.team_name, t.college_name 
    FROM users u 
    LEFT JOIN teams t ON u.team_id = t.id 
    WHERE (LOWER(u.email) = LOWER(?) OR UPPER(u.user_id) = UPPER(?)) AND u.access_code = ?
  `).get(cleanId, cleanId, cleanCode);

  if (!user) {
    return res.status(401).json({ error: 'Invalid Email/ID or Password.' });
  }

  if (user.role === 'AUDIENCE') {
    return res.status(403).json({ error: 'Audience voters must use OTP login with their email.' });
  }

  return res.json({
    success: true,
    user: {
      userId: user.user_id,
      name: user.role === 'PARTICIPANT' ? `Participant (${user.user_id}) - ${user.college_name || 'Faculty'}` : `Judge (${user.user_id})`,
      role: user.role,
      teamId: user.team_id,
      collegeName: user.college_name,
      teamName: user.team_name
    }
  });
});

// ----------------------------------------------------
// 1A. ADMIN REGISTRATION ROUTE
// ----------------------------------------------------
app.post('/api/auth/register-admin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username.trim(), password.trim());
    res.json({ success: true, message: 'Admin account created successfully. You can now login.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Admin username already exists.' });
    }
    res.status(500).json({ error: 'Failed to create admin account.' });
  }
});

// ----------------------------------------------------
// 1B. AUDIENCE OTP ROUTES
// ----------------------------------------------------
app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const cleanEmail = email.trim().toLowerCase();

  // Check if audience exists
  let user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'AUDIENCE'").get(cleanEmail);
  
  if (!user) {
    // Requirements: "For Audience, the email address must be registered/stored"
    // Auto-register audience if they don't exist for ease of use? 
    // Or reject? The prompt says: "For Audience, the email address must be registered/stored". 
    // Usually systems auto-register or admin adds them. Let's auto-register them as AUDIENCE if not exists.
    const aCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'AUDIENCE'").get().count;
    const newId = `A${(aCount + 1).toString().padStart(3, '0')}`;
    db.prepare('INSERT INTO users (user_id, email, access_code, role) VALUES (?, ?, ?, ?)').run(newId, cleanEmail, generateAccessCode(), 'AUDIENCE');
    user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'AUDIENCE'").get(cleanEmail);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes from now

  db.prepare('UPDATE users SET otp_code = ?, otp_expiry = ? WHERE id = ?').run(otp, expiry, user.id);

  // Configure Nodemailer Transporter
  // Use port 587 (STARTTLS) by default — more reliable on cloud platforms like Render.
  // Port 465 (SMTPS) is often blocked by cloud providers on free tier.
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpSecure = smtpPort === 465; // true only for 465 (SSL), false for 587 (STARTTLS)

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"EduInspire Event Portal" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: cleanEmail,
    subject: 'Your Audience Voting OTP - EduInspire',
    text: `Your OTP for audience voting is: ${otp}\nThis code is valid for 10 minutes.\nDo not share this code with anyone.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">EduInspire Voting Portal</h2>
        <p>Your one-time password (OTP) for audience voting is:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
      </div>
    `
  };

  try {
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER, 
            name: 'EduInspire Event Portal' 
          },
          to: [{ email: cleanEmail }],
          subject: 'Your Audience Voting OTP - EduInspire',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #4f46e5;">EduInspire Voting Portal</h2>
              <p>Your one-time password (OTP) for audience voting is:</p>
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
            </div>
          `
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Brevo API Error');
      }
      console.log(`[BREVO EMAIL SERVICE] -> Sent to: ${cleanEmail}`);
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your-email@gmail.com') {
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP EMAIL SERVICE] -> Sent to: ${cleanEmail} via port ${smtpPort}`);
    } else {
      console.log(`\n====================================================`);
      console.log(` [MOCK EMAIL SERVICE] -> Sent to: ${cleanEmail}`);
      console.log(` [OTP CODE]: ${otp} (Valid for 10 minutes)`);
      console.log(` Note: Configure .env with valid SMTP credentials to send real emails.`);
      console.log(`====================================================\n`);
    }
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Email API/SMTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP email. Please contact administrator.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'AUDIENCE'").get(cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (user.otp_code !== cleanOtp) {
    return res.status(401).json({ error: 'Invalid OTP.' });
  }

  if (new Date(user.otp_expiry) < new Date()) {
    return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
  }

  // Clear OTP after successful login
  db.prepare('UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = ?').run(user.id);

  res.json({
    success: true,
    user: {
      userId: user.user_id,
      name: `Audience Voter (${cleanEmail})`,
      role: 'AUDIENCE',
      email: cleanEmail
    }
  });
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, user_id, email, role, team_id, access_code FROM users ORDER BY role, user_id').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getComputedEventState() {
  const state = db.prepare('SELECT * FROM event_state WHERE id = 1').get();
  if (!state) return null;

  // 1. Presentation Timer Logic (Existing)
  let currentRemaining = state.timer_remaining ?? state.timer_seconds;
  let isRunning = state.timer_running === 1;

  if (isRunning && state.timer_started_at) {
    const elapsed = Math.floor((Date.now() - state.timer_started_at) / 1000);
    currentRemaining = Math.max(0, state.timer_remaining - elapsed);
    if (currentRemaining <= 0) {
      isRunning = false;
      db.prepare("UPDATE event_state SET timer_running = 0, timer_remaining = 0, timer_started_at = NULL WHERE id = 1").run();
    }
  }

  const elapsedSeconds = Math.max(0, state.timer_seconds - currentRemaining);
  const is5thMinReached = elapsedSeconds >= 300;

  // 2. Global Voting Timer Logic (New)
  let votingRemaining = state.voting_timer_remaining ?? state.voting_timer_seconds;
  let isVotingRunning = state.voting_timer_running === 1;

  if (isVotingRunning && state.voting_timer_started_at && state.evaluation_status === 'OPEN') {
    const vElapsed = Math.floor((Date.now() - state.voting_timer_started_at) / 1000);
    votingRemaining = Math.max(0, state.voting_timer_remaining - vElapsed);
    
    // Auto-close if timer hits 0
    if (votingRemaining <= 0) {
      isVotingRunning = false;
      const nowEnd = new Date().toISOString();
      db.prepare("UPDATE event_state SET voting_timer_running = 0, voting_timer_remaining = 0, voting_timer_started_at = NULL, evaluation_status = 'CLOSED', voting_end_time = ? WHERE id = 1").run(nowEnd);
      state.evaluation_status = 'CLOSED';
      state.voting_end_time = nowEnd;
    }
  }

  return {
    ...state,
    timer_remaining: currentRemaining,
    timer_running: isRunning ? 1 : 0,
    timer_elapsed: elapsedSeconds,
    is_5th_min_reached: is5thMinReached,
    
    // Voting stats to pass to frontend
    voting_timer_remaining: votingRemaining,
    voting_timer_running: isVotingRunning ? 1 : 0
  };
}

// ----------------------------------------------------
// 2. EVENT & PRESENTATION CONTROL ROUTES
// ----------------------------------------------------
app.get('/api/event/state', (req, res) => {
  const state = getComputedEventState();
  let currentTeam = null;

  if (state && state.current_team_id) {
    currentTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(state.current_team_id);
  }

  res.json({
    state,
    currentTeam
  });
});

app.post('/api/event/presentation/select', (req, res) => {
  const { teamId } = req.body;
  if (!teamId) return res.status(400).json({ error: 'Team ID is required' });

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  db.prepare(`
    UPDATE event_state
    SET current_team_id = ?, timer_remaining = timer_seconds, timer_running = 0, timer_started_at = NULL
    WHERE id = 1
  `).run(teamId);

  res.json({ success: true, currentTeam: team, state: getComputedEventState() });
});

app.post('/api/event/presentation/start', (req, res) => {
  const { teamId } = req.body;
  const targetId = teamId || db.prepare('SELECT current_team_id FROM event_state WHERE id = 1').get()?.current_team_id;

  if (!targetId) return res.status(400).json({ error: 'No team selected' });

  const now = Date.now();
  db.prepare("UPDATE teams SET presentation_status = 'IN_PROGRESS' WHERE id = ?").run(targetId);
  db.prepare(`
    UPDATE event_state
    SET current_team_id = ?, timer_running = 1, timer_remaining = timer_seconds, timer_started_at = ?
    WHERE id = 1
  `).run(targetId, now);

  const updatedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(targetId);
  res.json({ success: true, currentTeam: updatedTeam, state: getComputedEventState() });
});

app.post('/api/event/presentation/timer', (req, res) => {
  const { action } = req.body;
  const state = getComputedEventState();
  const now = Date.now();

  if (action === 'pause') {
    if (state.timer_running === 1) {
      db.prepare('UPDATE event_state SET timer_running = 0, timer_remaining = ?, timer_started_at = NULL WHERE id = 1').run(state.timer_remaining);
    }
  } else if (action === 'resume' || action === 'start') {
    if (state.timer_remaining > 0) {
      db.prepare('UPDATE event_state SET timer_running = 1, timer_started_at = ? WHERE id = 1').run(now);
    }
  } else if (action === 'reset') {
    db.prepare('UPDATE event_state SET timer_remaining = timer_seconds, timer_running = 0, timer_started_at = NULL WHERE id = 1').run();
  }

  res.json({ success: true, state: getComputedEventState() });
});

app.post('/api/event/presentation/set-timer', (req, res) => {
  const { durationSeconds } = req.body;
  if (!durationSeconds || durationSeconds < 0) return res.status(400).json({ error: 'Invalid duration' });

  db.prepare(`
    UPDATE event_state 
    SET timer_seconds = ?, timer_remaining = ?, timer_running = 0, timer_started_at = NULL 
    WHERE id = 1
  `).run(durationSeconds, durationSeconds);

  res.json({ success: true, state: getComputedEventState() });
});

app.post('/api/event/voting/global-update', (req, res) => {
  const { action, startTime, endTime, durationSeconds } = req.body; // action: 'START', 'STOP', 'SCHEDULE'
  
  if (action === 'START') {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const sec = durationSeconds && durationSeconds > 0 ? durationSeconds : 1200; // default 20 mins
    
    db.prepare(`
      UPDATE event_state 
      SET evaluation_status = 'OPEN', 
          voting_start_time = ?, 
          voting_end_time = NULL,
          voting_timer_seconds = ?,
          voting_timer_remaining = ?,
          voting_timer_running = 1,
          voting_timer_started_at = ?
      WHERE id = 1
    `).run(nowIso, sec, sec, nowMs);
  } else if (action === 'EDIT') {
    const nowMs = Date.now();
    const sec = durationSeconds && durationSeconds > 0 ? durationSeconds : 0;
    if (sec > 0) {
      const currentState = db.prepare('SELECT voting_timer_running FROM event_state WHERE id = 1').get();
      const isRunning = currentState?.voting_timer_running === 1;
      db.prepare(`
        UPDATE event_state 
        SET voting_timer_seconds = ?,
            voting_timer_remaining = ?,
            voting_timer_started_at = ?
        WHERE id = 1
      `).run(sec, sec, isRunning ? nowMs : null);
    }
  } else if (action === 'STOP') {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE event_state 
      SET evaluation_status = 'CLOSED', 
          voting_end_time = ?,
          voting_timer_running = 0,
          voting_timer_remaining = 0
      WHERE id = 1
    `).run(nowIso);
  } else if (action === 'RESET') {
    // Reset timer to its original duration and restart the clock
    const nowMs = Date.now();
    db.prepare(`
      UPDATE event_state 
      SET voting_timer_remaining = voting_timer_seconds,
          voting_timer_started_at = ?
      WHERE id = 1
    `).run(nowMs);
  } else if (action === 'SCHEDULE') {
    db.prepare("UPDATE event_state SET voting_start_time = ?, voting_end_time = ? WHERE id = 1").run(startTime, endTime);
  }


  res.json({ success: true, state: getComputedEventState() });
});

// ----------------------------------------------------
// 3. TEAM MANAGEMENT ROUTES (ADMIN)
// ----------------------------------------------------
app.get('/api/teams', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*,
           (SELECT COUNT(*) FROM audience_evaluations ae WHERE ae.team_id = t.id) as total_evaluations,
           (SELECT COUNT(*) FROM judge_scores js WHERE js.team_id = t.id) as judge_score_count
    FROM teams t
    ORDER BY t.presentation_order ASC
  `).all();

  res.json(teams);
});

app.get('/api/teams/:id', (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const participants = db.prepare('SELECT user_id, access_code FROM users WHERE team_id = ?').all(team.id);
  const judgeScores = db.prepare('SELECT * FROM judge_scores WHERE team_id = ?').all(team.id);
  const evaluationsCount = db.prepare('SELECT COUNT(*) as count FROM audience_evaluations WHERE team_id = ?').get(team.id).count;

  res.json({
    ...team,
    participants,
    judgeScores,
    evaluationsCount
  });
});

app.post('/api/teams', (req, res) => {
  const { teamName, collegeName, deptName, faculty1, faculty2 } = req.body;

  if (!teamName || !collegeName || !deptName || !faculty1 || !faculty2) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const maxOrder = db.prepare('SELECT MAX(presentation_order) as maxOrder FROM teams').get().maxOrder || 0;
  const newOrder = maxOrder + 1;
  const teamCode = `T${newOrder.toString().padStart(2, '0')}`;

  const result = db.prepare(`
    INSERT INTO teams (team_code, team_name, college_name, dept_name, faculty_1, faculty_2, presentation_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(teamCode, teamName, collegeName, deptName, faculty1, faculty2, newOrder);

  const teamId = result.lastInsertRowid;

  // Generate 2 participant credentials
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'").get().count;
  const p1Id = `P${(userCount + 1).toString().padStart(3, '0')}`;
  const p2Id = `P${(userCount + 2).toString().padStart(3, '0')}`;

  db.prepare('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, ?)').run(p1Id, generateAccessCode(), 'PARTICIPANT', teamId);
  db.prepare('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, ?)').run(p2Id, generateAccessCode(), 'PARTICIPANT', teamId);

  const createdTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  res.status(201).json(createdTeam);
});

app.put('/api/teams/:id', (req, res) => {
  const { teamName, collegeName, deptName, faculty1, faculty2, presentationOrder } = req.body;
  const teamId = req.params.id;

  const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!existing) return res.status(404).json({ error: 'Team not found' });

  db.prepare(`
    UPDATE teams
    SET team_name = ?, college_name = ?, dept_name = ?, faculty_1 = ?, faculty_2 = ?, presentation_order = ?
    WHERE id = ?
  `).run(
    teamName || existing.team_name,
    collegeName || existing.college_name,
    deptName || existing.dept_name,
    faculty1 || existing.faculty_1,
    faculty2 || existing.faculty_2,
    presentationOrder || existing.presentation_order,
    teamId
  );

  const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  res.json(updated);
});

app.delete('/api/teams/:id', (req, res) => {
  const teamId = req.params.id;
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  res.json({ success: true, message: 'Team deleted successfully.' });
});

app.post('/api/teams/bulk-upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let addedCount = 0;
    const maxOrder = db.prepare('SELECT MAX(presentation_order) as maxOrder FROM teams').get().maxOrder || 0;
    let nextOrder = maxOrder + 1;

    const insertTeam = db.prepare(`INSERT INTO teams (team_code, team_name, college_name, dept_name, faculty_1, faculty_2, presentation_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertUser = db.prepare('INSERT INTO users (user_id, access_code, role, team_id) VALUES (?, ?, ?, ?)');

    let userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'").get().count;

    db.transaction(() => {
      for (const row of data) {
        const teamName = row.TeamName || row['Team Name'];
        const collegeName = row.CollegeName || row['College Name'] || row.College;
        const deptName = row.DepartmentName || row.Department || row['Department Name'];
        const f1 = row.Faculty1 || row['Faculty 1'];
        const f2 = row.Faculty2 || row['Faculty 2'];

        if (!teamName || !collegeName) continue; // Skip invalid

        const exists = db.prepare('SELECT id FROM teams WHERE team_name = ? AND college_name = ?').get(teamName, collegeName);
        
        if (exists) {
          // Update existing team
          db.prepare(`
            UPDATE teams 
            SET dept_name = ?, faculty_1 = ?, faculty_2 = ?
            WHERE id = ?
          `).run(deptName || 'N/A', f1 || 'N/A', f2 || 'N/A', exists.id);
          addedCount++; // Count as processed
          continue;
        }

        const teamCode = `T${nextOrder.toString().padStart(2, '0')}`;
        const result = insertTeam.run(teamCode, teamName, collegeName, deptName || 'N/A', f1 || 'N/A', f2 || 'N/A', nextOrder);
        const teamId = result.lastInsertRowid;
        
        const p1Id = `P${(userCount + 1).toString().padStart(3, '0')}`;
        const p2Id = `P${(userCount + 2).toString().padStart(3, '0')}`;
        userCount += 2;

        insertUser.run(p1Id, generateAccessCode(), 'PARTICIPANT', teamId);
        insertUser.run(p2Id, generateAccessCode(), 'PARTICIPANT', teamId);

        nextOrder++;
        addedCount++;
      }
    })();

    res.json({ success: true, message: `Successfully processed ${addedCount} teams.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

// ----------------------------------------------------
// 4. JUDGE SCORES ROUTE
// ----------------------------------------------------
app.get('/api/judge/scores', (req, res) => {
  const scores = db.prepare(`
    SELECT js.*, t.team_code, t.team_name, t.college_name
    FROM judge_scores js
    JOIN teams t ON js.team_id = t.id
    ORDER BY t.presentation_order ASC
  `).all();
  res.json(scores);
});

app.post('/api/judge/scores', (req, res) => {
  const {
    judgeId,
    teamId,
    studentImpact,
    facultyImpact,
    adminImpact,
    socialImpact,
    innovation,
    implementation,
    outcomes,
    replicability
  } = req.body;

  if (!judgeId || !teamId) {
    return res.status(400).json({ error: 'Judge ID and Team ID are required.' });
  }

  // Validate range bounds
  const s = Math.min(20, Math.max(0, parseInt(studentImpact) || 0));
  const f = Math.min(10, Math.max(0, parseInt(facultyImpact) || 0));
  const a = Math.min(10, Math.max(0, parseInt(adminImpact) || 0));
  const soc = Math.min(10, Math.max(0, parseInt(socialImpact) || 0));
  const inn = Math.min(20, Math.max(0, parseInt(innovation) || 0));
  const imp = Math.min(15, Math.max(0, parseInt(implementation) || 0));
  const out = Math.min(10, Math.max(0, parseInt(outcomes) || 0));
  const rep = Math.min(5, Math.max(0, parseInt(replicability) || 0));

  const total = s + f + a + soc + inn + imp + out + rep;

  db.prepare(`
    INSERT INTO judge_scores (
      judge_id, team_id, student_impact, faculty_impact, admin_impact, social_impact,
      innovation, implementation, outcomes, replicability, total_score, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(judge_id, team_id) DO UPDATE SET
      student_impact = excluded.student_impact,
      faculty_impact = excluded.faculty_impact,
      admin_impact = excluded.admin_impact,
      social_impact = excluded.social_impact,
      innovation = excluded.innovation,
      implementation = excluded.implementation,
      outcomes = excluded.outcomes,
      replicability = excluded.replicability,
      total_score = excluded.total_score,
      updated_at = CURRENT_TIMESTAMP
  `).run(judgeId, teamId, s, f, a, soc, inn, imp, out, rep, total);

  const updatedScore = db.prepare('SELECT * FROM judge_scores WHERE judge_id = ? AND team_id = ?').get(judgeId, teamId);
  res.json({ success: true, score: updatedScore });
});

// ----------------------------------------------------
// 5. AUDIENCE & PARTICIPANT EVALUATION ROUTES
// ----------------------------------------------------
app.get('/api/evaluation/my-status', (req, res) => {
  const { voterId } = req.query;
  if (!voterId) return res.json({ evaluatedTeamIds: [], scores: {}, categoryScores: {} });

  const rows = db.prepare('SELECT * FROM audience_evaluations WHERE UPPER(voter_id) = UPPER(?)').all(voterId);
  const teamIds = rows.map(r => r.team_id);
  const scores = {};
  const categoryScores = {};
  
  rows.forEach(r => {
    scores[r.team_id] = r.total_score;
    categoryScores[r.team_id] = {
      studentImpact: r.student_impact,
      facultyImpact: r.faculty_impact,
      adminImpact: r.admin_impact,
      socialImpact: r.social_impact,
      innovation: r.innovation,
      implementation: r.implementation,
      outcomes: r.outcomes,
      replicability: r.replicability
    };
  });

  res.json({ evaluatedTeamIds: teamIds, scores, categoryScores });
});

app.post('/api/evaluation/submit', (req, res) => {
  const {
    voterId,
    voterRole,
    voterTeamId,
    votes // Array of { teamId, totalScore, ... }
  } = req.body;

  if (!votes || !Array.isArray(votes) || votes.length === 0) {
    return res.status(400).json({ error: 'Votes array is required and must contain at least 1 evaluation.' });
  }

  // 1. Check if evaluation is currently OPEN
  const state = db.prepare('SELECT * FROM event_state WHERE id = 1').get();
  if (state.evaluation_status !== 'OPEN') {
    return res.status(403).json({ error: 'Evaluation is currently CLOSED by Admin. You can only evaluate during the voting period.' });
  }

  // 2. Participant restriction: cannot evaluate own team
  if (voterRole === 'PARTICIPANT' && voterTeamId) {
    const votedForOwn = votes.some(v => parseInt(v.teamId) === parseInt(voterTeamId));
    if (votedForOwn) {
      return res.status(403).json({ error: 'PARTICIPANT RESTRICTION: You are NOT allowed to evaluate your own team!' });
    }
  }

  // 3. Upsert votes in a transaction
  const upsertStmt = db.prepare(`
    INSERT INTO audience_evaluations (
      voter_id, voter_role, voter_team_id, team_id, student_impact, faculty_impact,
      admin_impact, social_impact, innovation, implementation, outcomes, replicability, total_score, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID')
    ON CONFLICT(voter_id, team_id) DO UPDATE SET
      student_impact = excluded.student_impact,
      faculty_impact = excluded.faculty_impact,
      admin_impact = excluded.admin_impact,
      social_impact = excluded.social_impact,
      innovation = excluded.innovation,
      implementation = excluded.implementation,
      outcomes = excluded.outcomes,
      replicability = excluded.replicability,
      total_score = excluded.total_score,
      status = 'VALID',
      submitted_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction((votesList) => {
    for (const v of votesList) {
      const ts = Math.min(100, Math.max(0, parseInt(v.totalScore) || 0));
      upsertStmt.run(
        voterId,
        voterRole || 'AUDIENCE',
        voterTeamId || null,
        v.teamId,
        Math.min(20, Math.max(0, parseInt(v.studentImpact) || 0)),
        Math.min(10, Math.max(0, parseInt(v.facultyImpact) || 0)),
        Math.min(10, Math.max(0, parseInt(v.adminImpact) || 0)),
        Math.min(10, Math.max(0, parseInt(v.socialImpact) || 0)),
        Math.min(20, Math.max(0, parseInt(v.innovation) || 0)),
        Math.min(15, Math.max(0, parseInt(v.implementation) || 0)),
        Math.min(10, Math.max(0, parseInt(v.outcomes) || 0)),
        Math.min(5, Math.max(0, parseInt(v.replicability) || 0)),
        ts
      );
    }
  });

  try {
    transaction(votes);
    res.json({ success: true, message: `Successfully recorded evaluations for ${votes.length} team(s)!`, count: votes.length, status: 'VALID' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error saving evaluations.' });
  }
});

// ----------------------------------------------------
// 6. CREDENTIAL MANAGEMENT ROUTES
// ----------------------------------------------------
app.get('/api/credentials', (req, res) => {
  const users = db.prepare(`
    SELECT u.*, t.team_code, t.team_name, t.college_name,
           (SELECT COUNT(*) FROM audience_evaluations ae WHERE UPPER(ae.voter_id) = UPPER(u.user_id)) as evaluations_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY u.role DESC, u.user_id ASC
  `).all();

  const formatted = users.map(u => ({
    userId: u.user_id,
    email: u.email || null,
    accessCode: u.access_code,
    role: u.role,
    teamCode: u.team_code || 'N/A',
    teamName: u.team_name || 'N/A',
    collegeName: u.college_name || 'N/A',
    evaluationsCount: u.evaluations_count,
    status: u.role === 'ADMIN' ? 'Active' : (u.evaluations_count > 0 ? 'Used' : 'Unused')
  }));

  res.json(formatted);
});


// Delete a user by user_id
app.delete('/api/users/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const deleteOps = db.transaction(() => {
      // Remove audience evaluations if audience member
      if (user.role === 'AUDIENCE') {
        db.prepare('DELETE FROM audience_evaluations WHERE user_id = ?').run(user.id);
      }

      // If participant, check if team now has no members and clean up
      if (user.role === 'PARTICIPANT' && user.team_id) {
        db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
        const remaining = db.prepare("SELECT COUNT(*) as count FROM users WHERE team_id = ? AND role = 'PARTICIPANT'").get(user.team_id).count;
        if (remaining === 0) {
          // Remove related judge scores and team
          db.prepare('DELETE FROM judge_scores WHERE team_id = ?').run(user.team_id);
          db.prepare('DELETE FROM audience_evaluations WHERE team_id = ?').run(user.team_id);
          db.prepare('DELETE FROM manual_rankings WHERE team_id = ?').run(user.team_id);
          db.prepare('DELETE FROM manual_scores WHERE team_id = ?').run(user.team_id);
          db.prepare('DELETE FROM teams WHERE id = ?').run(user.team_id);
        }
      } else {
        db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
      }
    });

    deleteOps();
    res.json({ success: true, message: `User ${userId} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// Update user email by user_id
app.patch('/api/users/:userId/email', (req, res) => {
  const { userId } = req.params;
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check for email conflicts with other users
  const conflict = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? AND user_id != ?").get(cleanEmail, userId);
  if (conflict) {
    return res.status(409).json({ error: 'This email is already assigned to another user.' });
  }

  db.prepare("UPDATE users SET email = ? WHERE user_id = ?").run(cleanEmail, userId);
  res.json({ success: true, message: 'Email updated successfully.' });
});

// Bulk upload participants from Excel
app.post('/api/credentials/upload-participants', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let importedCount = 0;
    let skippedCount = 0;

    const stmt = db.prepare("INSERT INTO users (user_id, access_code, role, email) VALUES (?, ?, 'PARTICIPANT', ?)");
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE UPPER(user_id) = UPPER(?) OR (email IS NOT NULL AND UPPER(email) = UPPER(?))");

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        // Look for Email and Password in row keys (case-insensitive mapping might be better but let's assume 'Email' and 'Password')
        const rawEmail = row['Email'] || row['email'] || row['Email ID'] || row['userId'];
        const rawPassword = row['Password'] || row['password'] || row['accessCode'];
        
        if (!rawEmail) continue; // skip empty rows

        const email = String(rawEmail).trim();
        const password = rawPassword ? String(rawPassword).trim() : generateAccessCode();
        
        // We use Email as both user_id (for login) and email field
        const existing = checkStmt.get(email, email).count;

        if (existing > 0) {
          skippedCount++; // Skip duplicates as requested
        } else {
          stmt.run(email, password, email);
          importedCount++;
        }
      }
    });

    transaction(data);

    res.json({ success: true, imported: importedCount, skipped: skippedCount });
  } catch (err) {
    console.error('Error processing Excel file:', err);
    res.status(500).json({ error: 'Failed to process the uploaded file. Ensure it is a valid Excel format.' });
  }
});

// Bulk upload audience from Excel
app.post('/api/credentials/upload-audience', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    let importedCount = 0;
    let skippedCount = 0;

    let totalAudience = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'AUDIENCE'").get().count;

    const stmt = db.prepare("INSERT INTO users (user_id, access_code, role, email) VALUES (?, ?, 'AUDIENCE', ?)");
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'AUDIENCE' AND email IS NOT NULL AND LOWER(email) = LOWER(?)");

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        const rawEmail = row['Email'] || row['email'] || row['Email ID'];
        if (!rawEmail) continue;
        
        const email = String(rawEmail).trim();
        const password = generateAccessCode();
        
        const existing = checkStmt.get(email).count;
        if (existing > 0) {
          skippedCount++;
        } else {
          totalAudience++;
          const aId = `A${totalAudience.toString().padStart(3, '0')}`;
          stmt.run(aId, password, email);
          importedCount++;
        }
      }
    });

    transaction(data);
    res.json({ success: true, imported: importedCount, skipped: skippedCount });
  } catch (err) {
    console.error('Error processing Excel file:', err);
    res.status(500).json({ error: 'Failed to process the uploaded file. Ensure it is a valid Excel format.' });
  }
});

// Export all users to Excel
app.get('/api/users/export', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.role, u.user_id, u.email, u.access_code, t.team_name, t.college_name 
      FROM users u 
      LEFT JOIN teams t ON u.team_id = t.id 
      ORDER BY u.role, u.user_id
    `).all();

    const data = users.map(u => ({
      Role: u.role,
      'User ID': u.user_id,
      Email: u.email || 'Not provided',
      Password: u.access_code,
      'Team Name': u.team_name || 'N/A',
      'College Name': u.college_name || 'N/A'
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: 'Failed to export users.' });
  }
});

app.post('/api/credentials/generate-audience', (req, res) => {
  const { count } = req.body;
  const numToGen = Math.min(50, Math.max(1, parseInt(count) || 10));

  const totalAudience = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'AUDIENCE'").get().count;
  const generated = [];

  const stmt = db.prepare("INSERT INTO users (user_id, access_code, role) VALUES (?, ?, 'AUDIENCE')");

  for (let i = 1; i <= numToGen; i++) {
    const aId = `A${(totalAudience + i).toString().padStart(3, '0')}`;
    const code = generateAccessCode();
    stmt.run(aId, code);
    generated.push({ userId: aId, accessCode: code });
  }

  res.json({ success: true, count: generated.length, credentials: generated });
});

// ----------------------------------------------------
// 7. RESULTS, RANKINGS & DASHBOARD STATS
// ----------------------------------------------------
app.get('/api/results/dashboard', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY presentation_order ASC').all();
  const eventState = getComputedEventState(); // use live-computed timer values

  const totalTeams = teams.length;
  const totalJudges = 2; // Judge 1 & Judge 2
  const totalParticipants = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'").get().count;
  const totalAudience = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'AUDIENCE'").get().count;

  const totalEvaluationsCount = db.prepare("SELECT COUNT(*) as count FROM audience_evaluations WHERE status = 'VALID'").get().count;
  const completedTeamsCount = db.prepare("SELECT COUNT(*) as count FROM teams WHERE presentation_status = 'COMPLETED'").get().count;
  const pendingTeamsCount = totalTeams - completedTeamsCount;

  // Calculate Judge Rankings
  const judgeScores = db.prepare(`
    SELECT team_id,
           SUM(CASE WHEN judge_id = 'Judge 1' THEN total_score ELSE 0 END) as j1_score,
           SUM(CASE WHEN judge_id = 'Judge 2' THEN total_score ELSE 0 END) as j2_score,
           COUNT(DISTINCT judge_id) as judge_count,
           AVG(total_score) as avg_score
    FROM judge_scores
    GROUP BY team_id
  `).all();

  const judgeScoreMap = {};
  judgeScores.forEach(js => {
    judgeScoreMap[js.team_id] = js;
  });

  // Calculate Audience Rankings
  const audienceScores = db.prepare(`
    SELECT team_id,
           COUNT(*) as eval_count,
           AVG(total_score) as avg_score,
           AVG(student_impact) as avg_student,
           AVG(faculty_impact) as avg_faculty,
           AVG(admin_impact) as avg_admin,
           AVG(social_impact) as avg_social,
           AVG(innovation) as avg_innovation,
           AVG(implementation) as avg_implementation,
           AVG(outcomes) as avg_outcomes,
           AVG(replicability) as avg_replicability
    FROM audience_evaluations
    WHERE status = 'VALID'
    GROUP BY team_id
  `).all();

  const audienceScoreMap = {};
  audienceScores.forEach(as => {
    audienceScoreMap[as.team_id] = as;
  });

  // Get manual rankings overrides if saved
  const manualOverrides = db.prepare('SELECT * FROM manual_rankings').all();
  const manualJudgeMap = {};
  const manualAudienceMap = {};

  manualOverrides.forEach(mo => {
    if (mo.ranking_type === 'JUDGE') manualJudgeMap[mo.team_id] = mo.rank_position;
    if (mo.ranking_type === 'AUDIENCE') manualAudienceMap[mo.team_id] = mo.rank_position;
  });

  // Get manual score overrides
  const manualScores = db.prepare('SELECT * FROM manual_scores').all();
  const manualScoreJudgeMap = {};
  const manualScoreAudienceMap = {};
  manualScores.forEach(ms => {
    if (ms.ranking_type === 'JUDGE') manualScoreJudgeMap[ms.team_id] = ms.score;
    if (ms.ranking_type === 'AUDIENCE') manualScoreAudienceMap[ms.team_id] = ms.score;
  });

  // Build Judge Teams list
  const judgeList = teams.map(t => {
    const js = judgeScoreMap[t.id];
    const j1 = js ? js.j1_score : 0;
    const j2 = js ? js.j2_score : 0;
    const count = js ? js.judge_count : 0;
    // Average of 2 judges or available judge score
    let avgScore = count > 0 ? (count === 2 ? Math.round(((j1 + j2) / 2) * 100) / 100 : Math.round(js.avg_score * 100) / 100) : 0;
    
    // Apply manual score override if exists
    if (manualScoreJudgeMap[t.id] !== undefined) {
      avgScore = manualScoreJudgeMap[t.id];
    }

    return {
      teamId: t.id,
      teamCode: t.team_code,
      teamName: t.team_name,
      collegeName: t.college_name,
      deptName: t.dept_name,
      j1Score: j1,
      j2Score: j2,
      judgeCount: count,
      avgScore: avgScore,
      isManualScore: manualScoreJudgeMap[t.id] !== undefined,
      manualRank: manualJudgeMap[t.id] || null
    };
  });

  // Sort Judge list by manual rank first, then by avgScore DESC
  judgeList.sort((a, b) => {
    if (a.manualRank !== null && b.manualRank !== null) return a.manualRank - b.manualRank;
    if (a.manualRank !== null) return -1;
    if (b.manualRank !== null) return 1;
    return b.avgScore - a.avgScore;
  });

  judgeList.forEach((t, idx) => {
    t.calculatedRank = idx + 1;
  });

  // Detect Judge Ties
  const judgeTies = [];
  const judgeScoreCounts = {};
  judgeList.forEach(t => {
    if (t.avgScore > 0) {
      judgeScoreCounts[t.avgScore] = (judgeScoreCounts[t.avgScore] || 0) + 1;
    }
  });

  Object.keys(judgeScoreCounts).forEach(score => {
    if (judgeScoreCounts[score] > 1) {
      const tiedTeams = judgeList.filter(t => t.avgScore === parseFloat(score));
      judgeTies.push({
        score: parseFloat(score),
        teams: tiedTeams
      });
    }
  });

  // Build Audience Teams list
  const audienceList = teams.map(t => {
    const as = audienceScoreMap[t.id];
    let avgScore = as ? Math.round(as.avg_score * 100) / 100 : 0;
    
    // Apply manual score override if exists
    if (manualScoreAudienceMap[t.id] !== undefined) {
      avgScore = manualScoreAudienceMap[t.id];
    }

    return {
      teamId: t.id,
      teamCode: t.team_code,
      teamName: t.team_name,
      collegeName: t.college_name,
      deptName: t.dept_name,
      evalCount: as ? as.eval_count : 0,
      avgScore: avgScore,
      isManualScore: manualScoreAudienceMap[t.id] !== undefined,
      manualRank: manualAudienceMap[t.id] || null
    };
  });

  // Sort Audience list by manual rank first, then by avgScore DESC
  audienceList.sort((a, b) => {
    if (a.manualRank !== null && b.manualRank !== null) return a.manualRank - b.manualRank;
    if (a.manualRank !== null) return -1;
    if (b.manualRank !== null) return 1;
    return b.avgScore - a.avgScore;
  });

  audienceList.forEach((t, idx) => {
    t.calculatedRank = idx + 1;
  });

  // Detect Audience Ties
  const audienceTies = [];
  const audienceScoreCounts = {};
  audienceList.forEach(t => {
    if (t.avgScore > 0) {
      audienceScoreCounts[t.avgScore] = (audienceScoreCounts[t.avgScore] || 0) + 1;
    }
  });

  Object.keys(audienceScoreCounts).forEach(score => {
    if (audienceScoreCounts[score] > 1) {
      const tiedTeams = audienceList.filter(t => t.avgScore === parseFloat(score));
      audienceTies.push({
        score: parseFloat(score),
        teams: tiedTeams
      });
    }
  });

  const currentTeam = eventState.current_team_id ? db.prepare('SELECT * FROM teams WHERE id = ?').get(eventState.current_team_id) : null;

  res.json({
    stats: {
      totalTeams,
      totalJudges,
      totalParticipants,
      totalAudience,
      totalEvaluationsCount,
      completedTeamsCount,
      pendingTeamsCount
    },
    eventState,
    currentTeam,
    judgeRankings: judgeList,
    judgeTop5: judgeList.slice(0, 5),
    judgeTies,
    audienceRankings: audienceList,
    audienceWinner: audienceList.length > 0 ? audienceList[0] : null,
    audienceTies,
    resultsFinalized: eventState.results_finalized === 1
  });
});

// Add API for manual score override
app.post('/api/results/edit-score', (req, res) => {
  const { rankingType, teamId, score } = req.body;

  if (!rankingType || !teamId || score === undefined) {
    return res.status(400).json({ error: 'rankingType, teamId, and score are required.' });
  }

  const numericScore = parseFloat(score);

  if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    return res.status(400).json({ error: 'Score must be a number between 0 and 100.' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO manual_scores (ranking_type, team_id, score) 
      VALUES (?, ?, ?)
      ON CONFLICT(ranking_type, team_id) DO UPDATE SET score = excluded.score
    `);
    
    insertStmt.run(rankingType, teamId, numericScore);
    res.json({ success: true, message: 'Score updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while saving manual score.' });
  }
});

app.post('/api/results/reorder', (req, res) => {
  const { rankingType, orderedTeamIds } = req.body;

  if (!rankingType || !Array.isArray(orderedTeamIds)) {
    return res.status(400).json({ error: 'rankingType and orderedTeamIds array are required.' });
  }

  const type = rankingType.toUpperCase();
  const deleteStmt = db.prepare('DELETE FROM manual_rankings WHERE ranking_type = ?');
  const insertStmt = db.prepare('INSERT INTO manual_rankings (ranking_type, team_id, rank_position) VALUES (?, ?, ?)');

  const transaction = db.transaction(() => {
    deleteStmt.run(type);
    orderedTeamIds.forEach((teamId, index) => {
      insertStmt.run(type, teamId, index + 1);
    });
  });

  transaction();
  res.json({ success: true, message: `Manual ${type} rankings updated successfully.` });
});

app.post('/api/results/finalize', (req, res) => {
  db.prepare('UPDATE event_state SET results_finalized = 1 WHERE id = 1').run();
  res.json({ success: true, message: 'Final results officially locked and published!' });
});

app.post('/api/results/unfinalize', (req, res) => {
  db.prepare('UPDATE event_state SET results_finalized = 0 WHERE id = 1').run();
  res.json({ success: true, message: 'Results unlocked. You can now make manual adjustments.' });
});


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

// Serve static frontend files in production
app.use(express.static(distPath));

// Catch-all route to serve index.html for client-side routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` National PPT Evaluation Server running on port ${PORT}`);
  console.log(`====================================================`);
});

