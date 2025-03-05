import inquirer from 'inquirer';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function getConnectionData() {
    const data = await fs.readFile("./.cc.json", "utf8");
    return JSON.parse(data);
}

const conn_data = await getConnectionData();

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: conn_data.host,
    user: conn_data.username,
    password: conn_data.pass,
    database: conn_data.db,
    port: conn_data.port,
});


async function askQuestions() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Please write your username: ',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Please write your password: ',
      mask: '*', // Mask the password input
    },
    {
      type: 'input',
      name: 'email',
      message: 'Please write your email: ',
    },
    {
      type: 'input',
      name: 'discord_id',
      message: 'Please write your discord id (can be null): ',
      default: null, // Default value is null if no discord id is provided
    },
  ]);

  return answers;
}

async function initDB() {
  try {
    // Ask for user input
    const { username, password, email, discord_id } = await askQuestions();

    // Hash the password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    const user_uuid = uuidv4();

    // Insert data into the users table (assuming a `users` table exists)
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, mail, dsid, mail_verify, uuid) VALUES (?, ?, ?, ?, 1, ?)',
      [username, hashedPassword, email, discord_id, user_uuid]
    );
    
    const userID = result.insertId;
    
    const Skinid = uuidv4();
    const Cloak_id_one = uuidv4();
    const Cloak_id_second = uuidv4();

    await pool.execute(`
      INSERT INTO cloaks_lib (uuid, name)
      VALUES 
      (?, 'Legendary Cloak'),
      (?, 'Rare Cloak')`, [Cloak_id_one, Cloak_id_second]);

    await pool.execute(`INSERT INTO cloaks_users (uid, cloak_id) VALUES (?, ?)`, [userID, Cloak_id_one]);

    await pool.execute(`INSERT INTO skins_library (uuid, name, ownerid, slim, hd, disabled, cloak_id) VALUES (?, 'cute', ?, 0, 0, 0, ?)`, [Skinid, userID, Cloak_id_one]);

    await pool.execute(`INSERT INTO skin_user (uid, skin_id) VALUES (?, ?)`, [userID, Skinid]);

    console.info('User created with ID:', userID);

    // Audit info

    const query = `
            INSERT INTO audit_log (iss, action, target_id, old_value, new_value, field_changed, time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

    
    const time = Math.floor(Date.now() / 1000);

    const values = [userID, 'Created', userID, null, null, 'users', time];

    const [results] = await connection.query(query, values);

    logger.info('Audit entry added successfully:', results);






    process.exit(0);
    // Close the connection pool
  } catch (error) {
    console.error('Error:', error);
  }
}

initDB().catch(console.error);