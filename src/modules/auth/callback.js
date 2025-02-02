import OAuth2 from 'discord-oauth2';
import readConfig from '../../inc/yamlReader.js';
import jwt from 'jsonwebtoken';
import mysql from '../../inc/mysql.js';

const config = readConfig();
const SECRET_KEY = config.JWT_SECRET_KEY; // Ensure this is set in config.yml

const oauth = new OAuth2({
    clientId: config.discord.client_id,
    clientSecret: config.discord.secret_id,
    redirectUri: config.discord.redirect_url
});

function generateToken(user) {
    return jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
}

async function registerUser(userResponse, res) {
    try {
        const connection = await mysql.getConnection();
        const [existingUser] = await connection.query("SELECT id FROM users WHERE dsid = ?", [userResponse.id]);

        if (existingUser.length === 0) {
            const userID = Math.floor(Math.random() * (999999999999999999 - 1 + 1)) + 1;

            if (config.discord.scopes.includes('email') && !userResponse.email) {
                await connection.query("INSERT INTO users (id, dsid) VALUES (?, ?)", [userID, userResponse.id]);
            } else {
                await connection.query("INSERT INTO users (id, dsid, mail) VALUES (?, ?, ?)", [userID, userResponse.id, userResponse.email]);
            }
        }

        connection.release();

        const token = generateToken({ id: userResponse.id, username: userResponse.username });

        res.json({ user: userResponse, token });
    } catch (error) {
        console.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function discordCallback(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tokenResponse = await oauth.tokenRequest({
            code,
            scope: config.discord.scopes.join(' '),
            grantType: 'authorization_code',
            redirectUri: config.discord.redirect_url,
            clientId: config.discord.client_id,
            clientSecret: config.discord.secret_id
        });

        const userResponse = await oauth.getUser(tokenResponse.access_token);

        // Register the user and generate a token
        await registerUser(userResponse, res);
    } catch (error) {
        console.error('Error during Discord OAuth2 callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default discordCallback;