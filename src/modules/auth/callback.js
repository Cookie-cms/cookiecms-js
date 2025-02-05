import oauth from '@cookie-cms/oauth2-discord';
import jwt from 'jsonwebtoken';
import mysql from '../../inc/mysql.js';
import logger from '../../logger.js';
import createResponse from '../../inc/_common.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

function generateToken(user) {
    const JWT_SECRET_KEY = config.securecode;
    const payload = {
        iss: config.NameSite,
        sub: user?.user?.[0]?.id ?? null, // Correctly accessing the nested ID    
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = jwt.sign(payload, JWT_SECRET_KEY, { algorithm: 'HS256' });
    return token;
}

async function registerUser(userResponse, res) {
    try {
        const connection = await mysql.getConnection();
        const [existingUser] = await connection.query("SELECT id FROM users WHERE dsid = ?", [userResponse.id]);

        // if (existingUser.length === 0) {
        //     const userID = Math.floor(Math.random() * (999999999999999999 - 1 + 1)) + 1;

        //     if (config.discord.scopes.includes('email') && !userResponse.email) {
        //         await connection.query("INSERT INTO users (id, dsid) VALUES (?, ?)", [userID, userResponse.id]);
        //     } else {
        //         await connection.query("INSERT INTO users (id, dsid, mail, mail_verify) VALUES (?, ?, ?, 1)", [userID, userResponse.id, userResponse.email]);
        //     }
        // }

        
        // const [user] = await connection.query("SELECT id FROM users WHERE dsid = ?", [userResponse.id]);

        connection.release();

        // const token = generateToken({user});
        // console.log('Token:', token);

        const [discord_inf] = await connection.query("SELECT * FROM discord WHERE userid = ?", [userResponse.id]);


        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;
    
        console.log('Existing user:', discord_inf);

            if (discord_inf.length > 0) {
                // User already exists, update the existing record
                console.log('Updating existing user:', userResponse.id);

                if(userResponse.mail) {
                    await connection.query(
                        "UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ?, mail = ? WHERE userid = ?",
                        [userResponse.avatar, userResponse.username, randomCode, timexp, userResponse.id, userResponse.mail]
                    );
                } else {
                    await connection.query(
                        "UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ? WHERE userid = ?",
                        [userResponse.avatar, userResponse.username, randomCode, timexp, userResponse.id]
                    );
                }

                
            } else {
                console.log('Inserting new user:', userResponse.id);
                // User does not exist, insert a new record
                if(userResponse.mail) {
                    await connection.query(
                        "UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ?, mail = ? WHERE userid = ?",
                        [userResponse.avatar, userResponse.username, randomCode, timexp, userResponse.id, userResponse.mail]
                    );
                } else {
                    await connection.query(
                        "UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ? WHERE userid = ?",
                        [userResponse.avatar, userResponse.username, randomCode, timexp, userResponse.id]
                    );
                }
            }
        
        
       
        const userData = {
            id: userResponse.id,
            username: userResponse.username,
            avatar: userResponse.avatar,
            conn_id: randomCode
        };
        const data = {
            user: userData,
            // jwt: token
        };

        res.status(404).json(createResponse(true, 'User not found, do you want create or link?', "/home", data));
    } catch (error) {
        console.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function discordCallback(req, res) {
    const code = req.query.code;
    console.log("Отправка запроса с кодом:", code);


    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tokenResponse = await oauth.initOAuth(
            config.discord.redirect_url,
            config.discord.client_id,
            config.discord.secret_id,
            code
        );

        // console.info('Token response:', tokenResponse);
        const userResponse = await oauth.getUser(tokenResponse.access_token);
        // console.info('User response:', userResponse.id);
        // console.info('User response:', userResponse);
        // Register the user and generate a token
        await registerUser(userResponse, res);
    } catch (error) {
        console.error('Error during Discord OAuth:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }}


export default discordCallback;