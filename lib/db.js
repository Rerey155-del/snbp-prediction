import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_snbp_predictor",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database and tables
export async function initDB() {
  try {
    // Create database if not exists
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "db_snbp_predictor"}`,
    );
    await connection.end();

    // Create tables
    const createStudentsTable = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(255) NOT NULL,
                nisn VARCHAR(50) NOT NULL,
                kelas VARCHAR(50),
                jurusan VARCHAR(255),
                ptn VARCHAR(255),
                rata_rata FLOAT,
                hasil VARCHAR(50),
                tanggal DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

    const createTrainingTable = `
            CREATE TABLE IF NOT EXISTS training_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(255),
                rata_rata FLOAT,
                hasil VARCHAR(50)
            )
        `;

    await pool.query(createStudentsTable);
    await pool.query(createTrainingTable);

    // Ensure 'kelas' column exists (Migration)
    try {
      await pool.query(
        "ALTER TABLE students ADD COLUMN kelas VARCHAR(50) AFTER nisn",
      );
      console.log("Migration: Added 'kelas' column to students table");
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        console.error("Migration error:", err.message);
      }
    }

    console.log("Database and tables initialized/checked successfully (MySQL)");
  } catch (error) {
    console.error("Error initializing MySQL database:", error.message);
  }
}

export default pool;
