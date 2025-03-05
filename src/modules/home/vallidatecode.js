import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function validate_password(connection, userId, password) {
    const [user] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user.length) {
        throw new Error('User not found');
    }
    return bcrypt.compare(password, user[0].password);
}

async function validatecode(req, res) {
    const { code, password } = req.body;

    logger.info(code)

    if (!code) {
        return res.status(400).json({ error: true, msg: 'Code not provided' });
    }

    try {
        const connection = await mysql.getConnection();

        const [result] = await connection.query(`
            SELECT vc.userid, vc.action, vc.expire
            FROM verify_codes vc 
            JOIN users u ON vc.userid = u.id 
            WHERE vc.code = ?
        `, [code]);

        if (result.length === 0) {
            connection.release();
            return res.status(400).json({ error: true, msg: 'Invalid or expired token' });
        }

        const codeData = result[0];
        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime > codeData.expire) {
            connection.release();
            return res.status(400).json({ error: true, msg: 'Token has expired' });
        }

        // Add password validation
        if (password) {
            const isPasswordValid = await validate_password(connection, codeData.userid, password);
            if (!isPasswordValid) {
                connection.release();
                return res.status(400).json({ error: true, msg: 'Invalid password' });
            }
        }

        if (codeData.action === 2) {
            await connection.query("UPDATE users SET mail_verify = 1 WHERE id = ?", [codeData.userid]);
            await connection.query("DELETE FROM verify_codes WHERE code = ?", [code]);

            connection.release();
            return res.status(200).json({ error: false, msg: 'Email confirmed successfully', url: '/login' });
        } else {
            connection.release();
            return res.status(400).json({ error: true, msg: 'Invalid or expired token' });
        }
    } catch (err) {
        logger.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: 'Database Error' });
    }
}

export default validatecode;  // Changed from ConfirmMail to validatecode