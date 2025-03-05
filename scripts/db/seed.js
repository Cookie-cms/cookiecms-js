import inquirer from 'inquirer';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';

async function getConnectionData() {
    const data = await fs.readFile("./.cc.json", "utf8");
    return JSON.parse(data);
}

const conn_data = await getConnectionData();

// Создаем MySQL пул подключений
const pool = mysql.createPool({
    host: conn_data.host,
    user: conn_data.username,
    password: conn_data.pass,
    database: conn_data.db,
    port: conn_data.port,
});

async function downloadFile(url, folder, filename) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const filePath = path.join(folder, filename);

        await fs.writeFile(filePath, response.data);
        console.info(`Файл ${filename} загружен в ${folder}`);
        return filePath;
    } catch (error) {
        console.error(`Ошибка загрузки файла ${url}:`, error);
        return null;
    }
}

async function askQuestions() {
    const answers = await inquirer.prompt([
        { type: 'input', name: 'username', message: 'Please write your username: ' },
        { type: 'password', name: 'password', message: 'Please write your password: ', mask: '*' },
        { type: 'input', name: 'email', message: 'Please write your email: ', default: "example@example.com"},
        { type: 'input', name: 'discord_id', message: 'Please write your discord ID (can be null): ', default: null },
        { type: 'confirm', name: 'isAdmin', message: 'Do you want to grant admin privileges to this user?(example@example.com)', },
    ]);

    return answers;
}

async function initDB() {
    try {
        const { username, password, email, discord_id, isAdmin } = await askQuestions();

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        const user_uuid = uuidv4();

        // Вставляем пользователя в БД
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, mail, dsid, mail_verify, uuid, perms) VALUES (?, ?, ?, ?, 1, ?, ?)',
            [username, hashedPassword, email, discord_id, user_uuid, isAdmin ? 1 : 3]
        );

        const userID = result.insertId;
        console.info('User created with ID:', userID);

        // Создаем UUID для плащей и скина
        const Skinid = uuidv4();
        const Cloak_id_one = uuidv4();
        const Cloak_id_second = uuidv4();

        await downloadFile(
            'https://s.namemc.com/i/fa998338242ebcd8.png',
            './uploads/skins',
            `${Skinid}.png`
        );


        await downloadFile(
            'https://api.minecraftcapes.net/api/gallery/cb5d7d2d4f65ac0403ed225c790be245962a94bcd8c6c9a5584fa4b916f2ac6c/download',
            './uploads/capes',
            `${Cloak_id_one}.png`
        );

        await downloadFile(
            'https://api.minecraftcapes.net/api/gallery/dd3697fc889491ba2f32c3e59ad4ac4d0ce4cab8632b94a4f47e8bbca36b8860/download',
            './uploads/capes',
            `${Cloak_id_second}.png`
        );

        // Добавляем плащи в библиотеку
        await pool.execute(
            `INSERT INTO cloaks_lib (uuid, name) VALUES (?, 'Legendary Cloak'), (?, 'Rare Cloak')`,
            [Cloak_id_one, Cloak_id_second]
        );

        // Назначаем первый плащ пользователю
        await pool.execute(`INSERT INTO cloaks_users (uid, cloak_id) VALUES (?, ?)`, [userID, Cloak_id_one]);

        // Добавляем скин в библиотеку
        await pool.execute(
            `INSERT INTO skins_library (uuid, name, ownerid, slim, hd, disabled, cloak_id) VALUES (?, 'cute', ?, 0, 0, 0, ?)`,
            [Skinid, userID, Cloak_id_one]
        );

        // Назначаем скин пользователю
        await pool.execute(`INSERT INTO skin_user (uid, skin_id) VALUES (?, ?)`, [userID, Skinid]);

        // Добавляем запись в аудит-лог
        const time = Math.floor(Date.now() / 1000);
        await pool.execute(
            `INSERT INTO audit_log (iss, action, target_id, old_value, new_value, field_changed, time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userID, 'Created', userID, null, null, 'users', time]
        );

        console.info('User, skin, and cloaks added successfully.');

        // Закрываем пул соединений
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        await pool.end(); // Ensure pool is closed in case of an error
    }
}

initDB().catch(console.error);
