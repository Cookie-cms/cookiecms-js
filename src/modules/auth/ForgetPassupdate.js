import bcrypt from 'bcrypt';
import createResponse from '../../inc/_reponse.js';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

async function updatepass(req, res) {
    const { code, password } = req.body;

    if (!code || !password) {
        return res.status(400).json(createResponse(true, 'Code and new password are required'));
    }

    try {
        const connection = await mysql.getConnection();

        const [result] = await connection.query(`
            SELECT vc.userid, vc.expire
            FROM verify_codes vc 
            JOIN users u ON vc.userid = u.id 
            WHERE vc.code = ?
        `, [code]);

        if (result.length === 0) {
            connection.release();
            return res.status(400).json(createResponse(true, 'Invalid or expired token'));
        }

        const codeData = result[0];

        // Check if the token is expired
        const currentTime = new Date();
        const expireTime = new Date(codeData.expire * 1000); // Convert Unix timestamp to milliseconds

        if (expireTime < currentTime) {
            const query = "DELETE FROM verify_codes WHERE code = ?";
            await connection.query(query, [code]);

            connection.release();
            return res.status(400).json(createResponse(true, `Token has expired. Current time: ${currentTime} Expire time: ${expireTime}`));
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Update the user's password in the database
        await connection.query(`
            UPDATE users SET password = ? WHERE id = ?
        `, [hashedPassword, codeData.userid]);

        // Delete the verification code
        await connection.query(`
            DELETE FROM verify_codes WHERE code = ?
        `, [code]);

        connection.release();
        return res.status(200).json(createResponse(false, 'Password updated successfully'));
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json(createResponse(true, 'Database Error'));
    }
}

export default updatepass;