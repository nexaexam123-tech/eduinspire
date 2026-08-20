import db from '../server/db.js';
const [tables] = await db.query("SHOW TABLES");
console.log(JSON.stringify(tables, null, 2));
process.exit(0);

