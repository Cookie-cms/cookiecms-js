import OAuth2 from 'discord-oauth2';
import readConfig from '../../inc/yamlReader.js';
const config = readConfig();
import crypto from 'crypto';

const oauth = new OAuth2({
    clientId: config.discord.client_id,
    clientSecret: config.discord.secret_id,
    redirectUri: config.discord.redirect_url
});

const url = oauth.generateAuthUrl({
	scope: config.discord.scopes,
	state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
});

export default async function generateAuthLink(req, res) {
    return res.json({ url });
}
