import inquirer from 'inquirer';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';

async function getConnectionData() {
  const data = await fs.readFile("./.cc.json", "utf8");
  return JSON.parse(data);
}

async function checkDatabaseReset() {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmation',
      message: 'WARNING: This will reset the database. Type "YES I CONFIRM TO RESET" to proceed:',
      validate: (input) => {
        if (input === 'YES I CONFIRM TO RESET') {
          return true;
        }
        return 'Please type exactly "YES I CONFIRM TO RESET" to proceed or Ctrl+C to cancel';
      }
    }
  ]);
  return answer.confirmation === 'YES I CONFIRM TO RESET';
}

async function initDB() {
  try {
    const confirmed = await checkDatabaseReset();
    if (!confirmed) {
      console.info('Database reset cancelled');
      process.exit(0);
    }

    const conn_data = await getConnectionData();
    const pool = await mysql.createPool({
      host: conn_data.host,
      user: conn_data.username,
      password: conn_data.pass,
      database: conn_data.db,
      port: conn_data.port,
      multipleStatements: true
    });

    console.info("Connected to database!");
    
    const sql = await fs.readFile("./cookiecms.sql", "utf8");
    await pool.query(sql);
    
    console.info("Database initialized successfully!");
    await pool.end();
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

initDB();