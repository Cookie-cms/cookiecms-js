import knex from '../../../inc/knex.js';
import { isJwtExpiredOrBlacklisted, generateJwtToken } from '../../../inc/jwtHelper.js';
import { addaudit, createResponse } from '../../../inc/_common.js';
import logger from '../../../logger.js';
import readConfig from '../../../inc/yamlReader.js';
import { updateDiscordInfo, insertDiscordInfo } from './discordinfo.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function registerUser(userResponse, res) {
    const token = userResponse.headers['authorization'] ? userResponse.headers['authorization'].replace('Bearer ', '') : '';

    try {
        // Generate random code and expiration time
        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;
        
        // Check if discord info exists and update or insert
        const discordInfo = await knex('discord')
            .where('userid', userResponse.id)
            .first();

        if (discordInfo) {
            await knex('discord')
                .where('userid', userResponse.id)
                .update({
                    avatar_cache: userResponse.avatar,
                    name_gb: userResponse.username,
                    conn_id: randomCode,
                    expire: timexp,
                    mail: userResponse.email || null
                });
        } else {
            await knex('discord').insert({
                avatar_cache: userResponse.avatar,
                name_gb: userResponse.username,
                conn_id: randomCode,
                expire: timexp,
                mail: userResponse.email || null,
                userid: userResponse.id
            });
        }

        // Check if user is logged in
        if (token) {
            const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
            if (status.valid) {
                // Update user's Discord connection
                await knex('users')
                    .where('id', status.data.sub)
                    .update({ dsid: userResponse.id });

                // Add audit log
                await addaudit(status.data.sub, 9, status.data.sub, null, userResponse.id, 'dsid');
                
                return res.status(200).json(createResponse(false, 'Successfully connected account', "/home"));
            }
        }

        // Check if user exists
        const existingUser = await knex('users')
            .where('dsid', userResponse.id)
            .first('id');

        if (existingUser) {
            const userData = {
                jwt: generateJwtToken(existingUser.id, JWT_SECRET_KEY),
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(200).json(createResponse(false, 'Successfully logged in', "/home", userData));
        } else {
            const registerData = {
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(404).json(createResponse(true, 'User not found, do you want to create or link?', "/home", registerData));
        }
    } catch (error) {
        logger.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default registerUser;