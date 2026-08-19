import db from 'better-sqlite3';
const d = db('server/database.sqlite');
const tables = d.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(tables, null, 2));
