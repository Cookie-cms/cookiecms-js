import inquirer from 'inquirer';
import knex from 'knex';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getKnexConfig() {
  try {
    // Получаем путь к knexfile.js относительно корня проекта
    const knexfilePath = path.resolve(__dirname, '../../knexfile.js');
    console.info(`Looking for knexfile at: ${knexfilePath}`);
    
    // Проверяем существование файла
    try {
      await fs.access(knexfilePath);
      console.info('Knexfile found');
    } catch (err) {
      console.error('Knexfile not found at path:', knexfilePath);
      throw new Error(`Knexfile not found: ${knexfilePath}`);
    }
    
    // Преобразуем путь в file:// URL для Windows
    const knexfileURL = pathToFileURL(knexfilePath).href;
    console.info(`Importing from URL: ${knexfileURL}`);
    
    const knexfileModule = await import(knexfileURL);
    console.info('Knexfile module loaded:', Object.keys(knexfileModule));
    
    const knexConfig = knexfileModule.default || knexfileModule;
    console.info('Knex config structure:', Object.keys(knexConfig));
    
    // Проверяем, есть ли у конфигурации свойства окружений
    const environment = process.env.NODE_ENV || 'development';
    console.info(`Looking for environment: ${environment}`);
    
    let config;
    if (knexConfig[environment]) {
      // Если есть окружения (development, production, etc.)
      config = knexConfig[environment];
      console.info(`Found environment-specific config for ${environment}`);
    } else if (knexConfig.client && knexConfig.connection) {
      // Если конфигурация экспортируется напрямую (без окружений)
      config = knexConfig;
      console.info('Using direct config (no environments)');
    } else {
      throw new Error(`No valid configuration found. Available keys: ${Object.keys(knexConfig)}`);
    }
    
    console.info('Final config:', JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    console.error("Error reading knexfile.js:", error);
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

async function recreateDatabase(config) {
  if (!config || !config.connection) {
    throw new Error('Invalid database configuration: missing connection object');
  }

  // Создаем конфигурацию для подключения к системной БД
  const rootConfig = {
    ...config,
    connection: {
      ...config.connection,
      database: 'postgres' // Подключаемся к системной БД
    }
  };

  console.info('Root config:', JSON.stringify(rootConfig, null, 2));
  const rootKnex = knex(rootConfig);

  try {
    const databaseName = config.connection.database;
    console.info(`Target database: ${databaseName}`);
    
    // Завершаем все активные подключения к нашей БД
    console.info(`Terminating connections to ${databaseName}...`);
    await rootKnex.raw(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${databaseName}'
      AND pid <> pg_backend_pid()
    `);
    
    console.info(`Dropping database ${databaseName} if exists...`);
    await rootKnex.raw(`DROP DATABASE IF EXISTS "${databaseName}"`);
    
    console.info(`Creating database ${databaseName}...`);
    await rootKnex.raw(`CREATE DATABASE "${databaseName}"`);
    
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

    console.info('Loading Knex configuration...');
    const knexConfig = await getKnexConfig();
    
    if (!knexConfig) {
      throw new Error('Failed to load Knex configuration');
    }
    
    // Пересоздаем базу данных
    console.info('Recreating database...');
    await recreateDatabase(knexConfig);
    
    // Create knex instance with the config from knexfile.js
    console.info('Connecting to new database...');
    const db = knex(knexConfig);

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
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

initDB();