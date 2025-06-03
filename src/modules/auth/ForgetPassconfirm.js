import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';
import createResponse from '../../inc/common.js';

const config = readConfig();

export async function validate_code_fp(req, res) {
    const { code } = req.body;

    if (config.production === "demo") {
        return res.status(403).json(createResponse(true, 'Password reset is disabled in demo mode.'));
    }

    if (!code) {
        return res.status(400).json(createResponse(true, 'Code not provided'));
    }

    try {
        const result = await knex('verify_codes')
            .join('users', 'verify_codes.userid', '=', 'users.id')
            .where('verify_codes.code', code)
            .select('verify_codes.userid', 'verify_codes.action', 'verify_codes.expire')
            .first();

        if (!result) {
            return res.status(400).json(createResponse(true, 'Invalid or expired token'));
        }

        logger.info(`[INFO] Code Data: ${JSON.stringify(result)}`);

        // Check if the token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > result.expire) {
            // Delete the expired token
            await knex('verify_codes')
                .where('code', code)
                .delete();

            return res.status(400).json(createResponse(true, 'Token has expired'));
        }

        // Perform the action based on the result.action
        // Example: if (result.action === 'reset_password') { ... }

        return res.sendStatus(204);
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json(createResponse(true, 'Database Error'));
    }
}

export default validate_code_fp;