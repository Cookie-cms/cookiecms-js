import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../../logger.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission } from '../../inc/_common.js';
import pool from '../../inc/mysql.js';

const SENSITIVE_KEYS = [
    "securecode", "ServiceApiToken", "pass", "Password",
    "secret_id", "client_secret", "secret", "token", "key"
];

const extractTokens = (req) => {
    const apiKeyToken = req.headers['api-key']?.replace('Bearer ', '') || 
                        req.headers['api-key'] || 
                        null;
    const authToken = req.headers['authorization']?.replace('Bearer ', '') || 
                      req.headers['Authorization'] || 
                      null;
    
    // Assign the primary token based on availability
    const primaryToken = apiKeyToken || authToken;
    
    return { authToken, apiKeyToken, primaryToken };
};


const censorConfig = (config) => {
    const clonedConfig = JSON.parse(JSON.stringify(config));
    const recursiveCensor = (obj) => {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                recursiveCensor(obj[key]);
            } else if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
                obj[key] = '********';
            }
        });
    };
    recursiveCensor(clonedConfig);
    return clonedConfig;
};

const getSettings = async (req, res) => {
    try {
        const config = readConfig();
        const { primaryToken, authToken } = extractTokens(req);
        const conn = await pool.getConnection();
        

        if (!primaryToken) return res.status(401).json({ error: true, msg: "Authorization token required" });
        if (primaryToken !== config.ServiceApiToken) return res.status(403).json({ error: true, msg: "Invalid token" });
        
        const valid = await isJwtExpiredOrBlacklisted(authToken, conn, config.securecode);
        if (!valid) return res.status(401).json({ error: true, msg: "Invalid JWT" });
        
        const permissions = await checkPermission(pool, valid.data.sub, 'admin.settings');
        if (!permissions) return res.status(403).json({ error: true, msg: "Insufficient permissions" });
        
        logger.info('Settings retrieved successfully');
        return res.json({ error: false, msg: "Settings retrieved", data: censorConfig(config) });
    } catch (error) {
        logger.error('Error retrieving settings:', error);
        return res.status(500).json({ error: true, msg: "Failed to retrieve settings" });
    }
};

const updateSettings = async (req, res) => {
    try {
        const config = readConfig();

        const { primaryToken, authToken } = extractTokens(req);
        const conn = await pool.getConnection();

        if (!primaryToken) return res.status(401).json({ error: true, msg: "Authorization token required" });
        if (primaryToken !== config.ServiceApiToken) return res.status(403).json({ error: true, msg: "Invalid token" });
        
        const valid = await isJwtExpiredOrBlacklisted(authToken, conn, config.securecode);
        if (!valid) return res.status(401).json({ error: true, msg: "Invalid JWT" });
        
        const permissions = await checkPermission(pool, valid.data.sub, 'admin.settings');
        if (!permissions) return res.status(403).json({ error: true, msg: "Insufficient permissions" });
        
        const newSettings = req.body;
        if (!newSettings || Object.keys(newSettings).length === 0) {
            return res.status(400).json({ error: true, msg: "No settings provided" });
        }
        
        const deepMerge = (target, source) => {
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = deepMerge(target[key] || {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            });
            return target;
        };
        
        const updatedConfig = deepMerge(config, newSettings);
        
        SENSITIVE_KEYS.forEach(field => {
            if (config[field]) updatedConfig[field] = config[field];
        });
        
        const configPath = path.join(process.cwd(), 'src', 'config.yml');
        const backupPath = path.join(process.cwd(), 'src', 'config.backup.yml');
        await fs.copyFile(configPath, backupPath);
        await fs.writeFile(configPath, yaml.dump(updatedConfig, { indent: 2, lineWidth: -1 }), 'utf8');
        
        logger.info('Settings updated successfully');
        return res.json({ error: false, msg: "Settings updated successfully", data: censorConfig(updatedConfig) });
    } catch (error) {
        logger.error('Error updating settings:', error);
        console.log(error);
        return res.status(500).json({ error: true, msg: "Failed to update settings" });
    }
};

export { getSettings, updateSettings };
