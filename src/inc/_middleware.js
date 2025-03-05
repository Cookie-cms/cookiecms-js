import mysql from './mysql.js';
import readConfig from './yamlReader.js';
import { isJwtExpiredOrBlacklisted } from './jwtHelper.js';
import { checkPermission } from './_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

/**
 * Middleware for authentication and permission checking
 * @param {string} requiredPermission - Permission required for the route
 * @returns {Function} Express middleware
 */
export const authMiddleware = (requiredPermission = '') => {
    return async (req, res, next) => {
        let connection;
        try {
            connection = await mysql.getConnection();

            // Check JWT token
            const token = req.headers['authorization']?.replace('Bearer ', '') || '';
            if (!token) {
                return res.status(401).json({ 
                    error: true, 
                    msg: 'Invalid JWT', 
                    code: 401 
                });
            }

            // Validate token
            const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
            if (!status.valid) {
                return res.status(401).json({ 
                    error: true, 
                    msg: status.message, 
                    code: 401 
                });
            }

            // Check permissions if required
            if (requiredPermission) {
                const hasPermission = await checkPermission(connection, status.data.sub, requiredPermission);
                if (!hasPermission) {
                    return res.status(403).json({ 
                        error: true, 
                        msg: 'Insufficient permissions', 
                        code: 403 
                    });
                }
            }

            // Add user data to request object
            req.user = status.data;
            next();

        } catch (error) {
            return res.status(500).json({ 
                error: true, 
                msg: 'Internal server error', 
                code: 500 
            });
        } finally {
            if (connection) connection.release();
        }
    };
};