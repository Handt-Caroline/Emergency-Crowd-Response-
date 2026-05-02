 feat/backend-core
// src/config/database.js
 main
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
 feat/backend-core
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'ecrs',
  waitForConnections: true,
  connectionLimit:  10,
});

// Test connection when server starts
pool.getConnection()
  .then(conn => {
    console.log('MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('MySQL connection FAILED:', err.message);
    console.error('Check your .env: DB_HOST DB_USER DB_PASSWORD DB_NAME');
  });


  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

 main
module.exports = pool;