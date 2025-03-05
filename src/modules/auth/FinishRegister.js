import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import readConfig from '../../inc/yamlReader.js';
import pool from '../../inc/mysql.js';
import { addaudit } from '../../inc/_common.js';

import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function finishRegister(req, res) {
    const data = req.body;

    // logger.info("Incoming request body: " + JSON.stringify(data, null, 2));

    if (!data.username) {
        logger.info("Username is required.");
        return res.status(400).json({ error: true, msg: 'Username is required.' });
    }

    // if (!data.password) {
    //     logger.info("Password cannot be changed.");
    //     return res.status(400).json({ error: true, msg: 'Password cannot be changed.' });
    // }

    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    const connection = await pool.getConnection();
    const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

    // logger.info("Token status:", status);

    if (!status.valid) {
        connection.release();
        return res.status(401).json({ error: true, msg: status.message });
    }

    const userId = status.data.sub;

    const [user] = await connection.query("SELECT username, uuid, mail_verify, password FROM users WHERE id = ?", [userId]);

    // logger.info("User data: " + JSON.stringify(user, null, 2));

    if (user && user.length && (user[0].username || user[0].uuid)) {
        logger.info("User already has a Player account.");
        connection.release();
        return res.status(409).json({ error: true, msg: 'You already have a Player account', url: '/home' });
    }

    const [existingUsername] = await connection.query("SELECT username FROM users WHERE username = ?", [data.username]);

    if (existingUsername.length) {
        logger.info("Username already taken.");
        connection.release();
        return res.status(409).json({ error: true, msg: 'Username already taken.' });
    } else {
        const newUuid = uuidv4();
        await connection.query("UPDATE users SET uuid = ?, username = ? WHERE id = ?", [newUuid, data.username, userId]);

        await addaudit(
            connection,
            userId,
            5,
            userId,
            null,  // oldValue
            data.username,  // newValue
            'users-update'  // fieldChanged
        );
        if (data.password) {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
        }

        const affectedRows = await connection.query("SELECT ROW_COUNT() AS affectedRows");
        logger.info("User update affected rows: " + affectedRows[0].affectedRows);
        if (affectedRows[0].affectedRows > 0) {
            // logger.info("User updated successfully. Rows affected: " + affectedRows[0].affectedRows);
        } else {
            // logger.info("Update executed, but no rows were affected. Rows affected: " + affectedRows[0].affectedRows);
        }
    }

    connection.release();
    return res.status(200).json({ success: true, msg: 'Registration completed successfully', url: '/home' });
}

export default finishRegister;