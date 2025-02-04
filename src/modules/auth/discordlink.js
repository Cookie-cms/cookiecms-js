import  oauth2  from '@cookie-cms/oauth2-discord'; // Import the function
import readConfig from '../../inc/yamlReader.js'; // Import your config reader

const config = readConfig(); // Load the config

// Using the imported function to generate the OAuth URL
export default async function generateAuthLink(req, res) {
    // Join the array of scopes into a space-separated string
    const url = oauth2.getOAuthUrl(config.discord.client_id, config.discord.redirect_url, config.discord.scopes);
    return res.json({ url });
}