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
      message: 'WARNING: This will COMPLETELY DELETE and recreate the database. Type "YES I CONFIRM TO RESET" to proceed:',
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

async function recreateDatabase(connData) {
  // Подключаемся к системной БД postgres, а не к нашей
  const rootKnex = knex({
    client: connData.type,
    connection: {
      host: connData.host,
      user: connData.username,
      password: connData.pass,
      port: connData.port,
      database: 'postgres' // Подключаемся к системной БД
    }
  });

  try {
    // Завершаем все активные подключения к нашей БД
    console.info(`Terminating connections to ${connData.db}...`);
    await rootKnex.raw(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${connData.db}'
      AND pid <> pg_backend_pid()
    `);
    
    console.info(`Dropping database ${connData.db} if exists...`);
    await rootKnex.raw(`DROP DATABASE IF EXISTS ${connData.db}`);
    
    console.info(`Creating database ${connData.db}...`);
    await rootKnex.raw(`CREATE DATABASE ${connData.db}`);
    
    console.info("Database recreated successfully!");
  } catch (error) {
    console.error("Error recreating database:", error);
    throw error;
  } finally {
    await rootKnex.destroy();
  }
}

async function initDB() {
  try {
    const confirmed = await checkDatabaseReset();
    if (!confirmed) {
      console.info('Database reset cancelled');
      process.exit(0);
    }

    const conn_data = await getConnectionData();
    
    // Пересоздаем базу данных
    await recreateDatabase(conn_data);
    
    // Create knex instance connected to the specific database
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