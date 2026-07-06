const mysql = require('mysql2/promise');

console.log('[db] DB_HOST=%s DB_PORT=%s DB_USER=%s DB_NAME=%s DB_PASSWORD_set=%s',
  JSON.stringify(process.env.DB_HOST),
  JSON.stringify(process.env.DB_PORT),
  JSON.stringify(process.env.DB_USER),
  JSON.stringify(process.env.DB_NAME),
  Boolean(process.env.DB_PASSWORD));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
