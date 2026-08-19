import db from 'better-sqlite3';
const d = db('server/database.sqlite');
d.prepare("UPDATE event_state SET evaluation_status='OPEN'").run();
console.log('Opened');
