import inquirer from 'inquirer';
import knex from 'knex';
import fs from 'fs/promises';
import path from 'path';

async function getConnectionData() {
  try {
    const data = await fs.readFile("./.cc.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading config:", error);
    process.exit(1);
  }
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
    
    // Create knex instance
    const db = knex({
      client: conn_data.type,
      connection: {
        host: conn_data.host,
        user: conn_data.username,
        password: conn_data.pass,
        database: conn_data.db,
        port: conn_data.port
      }
    });

    console.info("Connected to database!");
    
    // Run the migrations
    console.info("Running migrations...");
    await db.migrate.latest();
    
    // Run the seeds if requested
    const seedAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runSeeds',
        message: 'Do you want to seed the database with initial data?',
        default: true
      }
    ]);
    
    if (seedAnswer.runSeeds) {
      console.info("Running seeds...");
      await db.seed.run();
    }
    
    console.info("Database initialized successfully!");
    await db.destroy();
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

initDB();