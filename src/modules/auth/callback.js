import OAuth2 from 'discord-oauth2';
import readConfig from '../../inc/yamlReader.js';
import mysql from '../../inc/mysql.js';
const config = readConfig();

const oauth = new OAuth2({
    clientId: config.discord.client_id,
    clientSecret: config.discord.secret_id,
    redirectUri: config.discord.redirect_url
});


async function checkuser(userid) {

    const connection = await mysql.getConnection();
    const [user] = await connection.query("SELECT * FROM users WHERE dsid = ?", [userid]);
    connection.release();
    if (!user.length || !user[0].username || !user[0].uuid || !user[0].password) {
        return false;
    }
    return true;

}

async function registerUser(userData) {
    const connection = await mysql.getConnection();
    const userID =  Math.floor(Math.random() * (999999999999999999 - 1 + 1)) + 1;

    const [existingUser] = await connection.query("SELECT * FROM users WHERE mail = ?", [userData.email]);

    if (existingUser.length > 0) {
        connection.release();
        return res.status(409).json({ error: true, msg: "Email is already registered." });
    }

    const [result] = await connection.query(
        "INSERT INTO users (id, mail, mail_verify) VALUES (?, ?, ?)",
        [userID, userData.email, 1]
    );
    connection.release();
    return result.insertId;
}

function generateToken(userId) {
    const payload = {
        iss: config.NameSite,
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = jwt.sign(payload, JWT_SECRET_KEY, { algorithm: 'HS256' });
    connection.release();
    return res.status(200).json({
        error: false,
        msg: 'Login successful',
        url: '/home',
        data: { jwt: token }
    });
}


export default async function discordCallback(req, res) {
    const code = req.query.code;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tokenResponse = await oauth.tokenRequest({
            code,
            scope: config.discord.scopes.join(' '),
            grantType: 'authorization_code'
        });

        const userResponse = await oauth.getUser(tokenResponse.access_token);

        // Проверяем, зарегистрирован ли пользователь
        if (await checkuser(userResponse.id)) {
            // Пользователь зарегистрирован, отправляем токен
            const token = generateToken(userResponse.id);
            return res.status(200).json(createResponse(false, 'Login successful', '/home', { jwt: token }));
        } else {
            // Если пользователь не зарегистрирован, регистрируем его
            const userId = await registerUser(userResponse);
            const token = generateToken(userId);
            return res.status(200).json(createResponse(false, 'redirect to signup', null, { jwt: token }));
        }

    } catch (error) {
        console.error('Error during Discord OAuth2 callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}