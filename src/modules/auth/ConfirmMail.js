import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { validateData } from '../../middleware/validation.js';

import dotenv from 'dotenv';

dotenv.config();

async function ConfirmMail(req, res) {
    if (process.env.ENV === "demo") {
        return res.status(403).json({ error: true, msg: 'Email confirmation is disabled in demo mode.' });
    }

    // Валидация входных данных
    const validation = validateData(req.body, 'confirmMail');
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Invalid or expired token',
            details: validation.errors
        });
    }

    const { code } = validation.value;

    try {
        const result = await knex('verify_codes')
            .join('users', 'verify_codes.userid', '=', 'users.id')
            .select('verify_codes.userid', 'verify_codes.action', 'verify_codes.expire')
            .where('verify_codes.code', code)
            .first();

        if (!result) {
            return res.status(400).json({ error: true, msg: 'Invalid or expired token' });
        }

        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime > result.expire) {
            return res.status(400).json({ error: true, msg: 'Token has expired' });
        }

        if (result.action === 1) {
            await knex.transaction(async trx => {
                await trx('users')
                    .where('id', result.userid)
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
};

export default ConfirmMail;