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
    const knexfilePath = path.resolve(__dirname, '../knexfile.js');
    console.info(`Looking for knexfile at: ${knexfilePath}`);
    try {
      await fs.access(knexfilePath);
      console.info('Knexfile found');
    } catch (err) {
      console.error('Knexfile not found at path:', knexfilePath);
      throw new Error(`Knexfile not found: ${knexfilePath}`);
    }
    const knexfileURL = pathToFileURL(knexfilePath).href;
    console.info(`Importing from URL: ${knexfileURL}`);
    const knexfileModule = await import(knexfileURL);
    console.info('Knexfile module loaded:', Object.keys(knexfileModule));
    const knexConfig = knexfileModule.default || knexfileModule;
    console.info('Knex config structure:', Object.keys(knexConfig));
    const environment = process.env.NODE_ENV || 'development';
    console.info(`Looking for environment: ${environment}`);
    let config;
    if (knexConfig[environment]) {
      config = knexConfig[environment];
      console.info(`Found environment-specific config for ${environment}`);
    } else if (knexConfig.client && knexConfig.connection) {
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

async function getDb() {
  const config = await getKnexConfig();
  return knex(config);
}

async function checkDbInitialized(db) {
  // You can add logic here to check if DB is initialized
  // For now, just a placeholder
  return true;
}

async function selectUser(db) {
  const users = await db('users').select('id', 'uuid', 'username').limit(50);
  if (users.length === 0) {
    console.error('No users found in the database.');
    process.exit(1);
  }
  const choices = users.map(u => ({
    name: `${u.username} (id: ${u.id}, uuid: ${u.uuid})`,
    value: u.id
  }));
  const { userId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'userId',
      message: 'Select a user:',
      choices
    }
  ]);
  return userId;
}

async function selectRole(db) {
  const roles = await db('permissions_groups').select('id', 'name', 'level');
  if (roles.length === 0) {
    console.error('No available roles.');
    process.exit(1);
  }
  const choices = roles.map(r => ({
    name: `${r.name} (id: ${r.id}, level: ${r.level})`,
    value: r.id
  }));
  const { roleId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'roleId',
      message: 'Select a role to assign:',
      choices
    }
  ]);
  return roleId;
}

async function setUserRole(db, userId, roleId) {
  await db('users').where({ id: userId }).update({ permission_group_id: roleId });
  console.log(`Role successfully assigned to user with id ${userId}: role id ${roleId}`);
}

async function main() {
  const db = await getDb();
  await checkDbInitialized(db);
  const userId = await selectUser(db);
  const roleId = await selectRole(db);
  await setUserRole(db, userId, roleId);
  await db.destroy();
}

main();