import knex from '../../inc/knex.js';
// import readConfig from '../../inc/yamlReader.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';

// const config = readConfig();
// const JWT_SECRET_KEY = config.securecode;

async function validate_password(userId, password) {
    const user = await knex('users')
        .where({ id: userId })
        .first('password');
        
    if (!user) {
        throw new Error('User not found');
    }
    return bcrypt.compare(password, user.password);
}

async function validatecode(req, res) {
    const { code, password } = req.body;

    logger.info(code);

    if (!code) {
        return res.status(400).json({ error: true, msg: 'Code not provided' });
    }

    try {
        const codeData = await knex('verify_codes')
            .join('users', 'verify_codes.userid', '=', 'users.id')
            .where('verify_codes.code', code)
            .first('verify_codes.userid', 'verify_codes.action', 'verify_codes.expire');

        if (!codeData) {
            return res.status(400).json({ error: true, msg: 'Invalid or expired token' });
        }

        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime > codeData.expire) {
            return res.status(400).json({ error: true, msg: 'Token has expired' });
        }

        // Add password validation
        if (password) {
            const isPasswordValid = await validate_password(codeData.userid, password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: true, msg: 'Invalid password' });
            }
        }

        if (codeData.action === 2) {
            // Use transaction to ensure both operations complete
            await knex.transaction(async (trx) => {
                await trx('users')
                    .where('id', codeData.userid)
                    .update({ mail_verify: 1 });
                    
                await trx('verify_codes')
                    .where('code', code)
                    .delete();
            });

            return res.status(200).json({ error: false, msg: 'Email confirmed successfully', url: '/login' });
        } else {
            return res.status(400).json({ error: true, msg: 'Invalid or expired token' });
        }
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'Database Error' });
    }
}

export default validatecode;  // Changed from ConfirmMail to validatecode