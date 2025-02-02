import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';
// import createResponse from '../../utils/createResponse.js';

const config = readConfig();
// const JWT_SECRET_KEY = config.securecode;


export async function validate_code_fp(req, res) {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json(createResponse(true, 'Code not provided'));
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

        // Perform the action based on the codeData.action
        // Example: if (codeData.action === 'reset_password') { ... }

        connection.release();
        return res.sendStatus(204);
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json(createResponse(true, 'Database Error'));
    }
}

export default validate_code_fp;