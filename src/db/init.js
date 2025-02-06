import mysql from "mysql2/promise";
import fs from "fs/promises";

// Load database connection settings
const conn_data = JSON.parse(await fs.readFile("./.cc.json", "utf8"));

// Path to SQL file
const databaseFile = "./cookiecms.sql";

async function initDB() {
  try {
    // Create a connection pool
    const pool = await mysql.createPool({
      host: conn_data.host,
      user: conn_data.username,
      password: conn_data.pass,
      database: conn_data.db,
      port: conn_data.port,
      multipleStatements: true, // Allows running multiple queries
    });

    console.log("Connected to database!");

    // Read the SQL file
    const sql = await fs.readFile(databaseFile, "utf8");

    // Execute SQL file content
    await pool.query(sql);
    
    console.log("Database initialized successfully!");

    // Close the pool
    await pool.end();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initDB();