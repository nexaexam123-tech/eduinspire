import db from './server/db.js';
await db.query("UPDATE event_state SET evaluation_status='OPEN' WHERE id = 1");
console.log('Evaluation opened in MySQL');
process.exit(0);

