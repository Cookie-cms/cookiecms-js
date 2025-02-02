import axios from 'axios';
import crypto from 'crypto';
import { URLSearchParams } from 'url';

const baseUrl = 'https://discord.com';
let botToken = null;

function genState() {
    const state = crypto.randomBytes(12).toString('hex');
    return state;
}

export function getOAuthUrl(clientId, redirectUri, scope) {
    const state = genState();
    return `${baseUrl}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

export async function initOAuth(redirectUri, clientId, clientSecret, code, botTokenParam = null) {
    if (botTokenParam) {
        botToken = botTokenParam;
    }

    const url = `${baseUrl}/api/oauth2/token`;
    const data = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
    });

    try {
        const response = await axios.post(url, data.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error initializing OAuth:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function getUser(accessToken) {
    const url = `${baseUrl}/api/users/@me`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

export async function giveRole(guildId, roleId, userId) {
    const url = `${baseUrl}/api/guilds/${guildId}/members/${userId}/roles/${roleId}`;
    const data = { roles: [roleId] };
    try {
        const response = await axios.put(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error giving role:', error);
        throw error;
    }
}

export async function getGuilds(accessToken) {
    const url = `${baseUrl}/api/users/@me/guilds`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting guilds:', error);
        throw error;
    }
}

export async function getGuild(guildId) {
    const url = `${baseUrl}/api/guilds/${guildId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bot ${botToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting guild:', error);
        throw error;
    }
}

export async function getConnections(accessToken) {
    const url = `${baseUrl}/api/users/@me/connections`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting connections:', error);
        throw error;
    }
}

export async function joinGuild(guildId, accessToken, userId) {
    const url = `${baseUrl}/api/guilds/${guildId}/members/${userId}`;
    const data = { access_token: accessToken };
    try {
        const response = await axios.put(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error joining guild:', error);
        throw error;
    }
}

export function checkState(state, sessionState) {
    return state === sessionState;
}


export default {
    getOAuthUrl,
    initOAuth,
    getUser,
    giveRole,
    getGuilds,
    getGuild,
    getConnections,
    joinGuild,
    checkState
};