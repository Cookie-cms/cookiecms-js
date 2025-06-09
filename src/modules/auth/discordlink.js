import  oauth2  from '@cookie-cms/oauth2-discord'; // Import the function
import dotenv from 'dotenv';

dotenv.config();

// Using the imported function to generate the OAuth URL
export default async function generateAuthLink(req, res) {
    // Join the array of scopes into a space-separated string
    const url = oauth2.getOAuthUrl(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_REDIRECT_URL, process.env.DISCORD_SCOPES);
    return res.json({ url });
}