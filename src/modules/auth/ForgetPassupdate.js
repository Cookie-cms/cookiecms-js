import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';
// import createResponse from '../../utils/createResponse.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

export async function updatepass(req, res) {
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
        return res.status(400).json(createResponse(true, 'Code and new password are required'));
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
            return res.status(400).json(createResponse(true, 'Invalid or expired token'));
        }

        const codeData = result[0];

        logger.info(`[INFO] Code Data: ${JSON.stringify(codeData)}`);

        // Check if the token is expired
        const currentTime = new Date();
        const expireTime = new Date(codeData.expire * 1000); // Convert Unix timestamp to milliseconds
        if (expireTime < currentTime) {
            connection.release();
            const query = "DELETE FROM verify_codes WHERE code = ?";
            await connection.query(query, [code]);

            return res.status(400).json(createResponse(true, `Token has expired. Current time: ${currentTime} Expire time: ${expireTime}`));
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

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