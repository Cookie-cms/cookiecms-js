import inquirer from 'inquirer';
import knexConfig from '../../knexfile.js';
import knex from 'knex';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';

const db = knex(knexConfig);

async function downloadFile(url, folder, filename) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const filePath = path.join(folder, filename);

    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(filePath, response.data);
    console.info(`File ${filename} downloaded to ${folder}`);
    return filePath;
  } catch (error) {
    console.error(`Error downloading file ${url}:`, error);
    return null;
  }
}

async function askQuestions() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'username', message: 'Please write your username: ' },
    { type: 'password', name: 'password', message: 'Please write your password: ', mask: '*' },
    { type: 'input', name: 'email', message: 'Please write your email: ', default: "example@example.com"},
    { type: 'input', name: 'discord_id', message: 'Please write your discord ID (can be null): ', default: null },
    { type: 'confirm', name: 'isAdmin', message: 'Do you want to grant admin privileges to this user?', default: true },
  ]);
  return answers;
}

async function seedDB() {
  try {
    // Get user input
    const { username, password, email, discord_id, isAdmin } = await askQuestions();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_uuid = uuidv4();

    // Insert user and get ID (PostgreSQL)
    const rows = await db('users')
      .insert({
        username,
        password: hashedPassword,
        mail: email,
        dsid: discord_id,
        mail_verify: 1,
        uuid: user_uuid,
        perms: isAdmin ? 1 : 3
      })
      .returning('id');
    const userId = rows[0].id ?? rows[0]; // для разных версий knex/pg

    if (!userId) {
      throw new Error('Failed to get user ID after insertion');
    }

    console.info('User created with ID:', userId);

    // Create UUIDs for skins and cloaks
    const skinId = uuidv4();
    const cloakIdOne = uuidv4();
    const cloakIdTwo = uuidv4();

    // Download assets
    await downloadFile(
      'https://s.namemc.com/i/fa998338242ebcd8.png',
      './uploads/skins',
      `${skinId}.png`
    );

    await downloadFile(
      'https://api.minecraftcapes.net/api/gallery/cb5d7d2d4f65ac0403ed225c790be245962a94bcd8c6c9a5584fa4b916f2ac6c/download',
      './uploads/capes',
      `${cloakIdOne}.png`
    );

    await downloadFile(
      'https://api.minecraftcapes.net/api/gallery/dd3697fc889491ba2f32c3e59ad4ac4d0ce4cab8632b94a4f47e8bbca36b8860/download',
      './uploads/capes',
      `${cloakIdTwo}.png`
    );

    console.log('Adding cloaks and skins for user with ID:', userId);

    // Add cloaks to library
    await db('cloaks_lib').insert([
      { uuid: cloakIdOne, name: 'Legendary Cloak' },
      { uuid: cloakIdTwo, name: 'Rare Cloak' }
    ]);

    // Assign cloak to user
    await db('cloaks_users').insert({
      uid: userId,
      cloak_id: cloakIdOne
    });

    // Add skin to library
    await db('skins_library').insert({
      uuid: skinId,
      name: 'cute',
      ownerid: userId,
      slim: false,
      hd: false,
      disabled: false,
      cloak_id: cloakIdOne
    });

    // Assign skin to user
    await db('skin_user').insert({
      uid: userId,
      skin_id: skinId
    });

    // Add audit log entry
    const time = Math.floor(Date.now() / 1000);
    await db('audit_log').insert({
      iss: userId,
      action: 1,
      target_id: userId,
      field_changed: 'users',
      time: time
    });

    console.info('User, skin, and cloaks added successfully.');
    await db.destroy();

  } catch (error) {
    console.error('Error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

seedDB().catch(console.error);