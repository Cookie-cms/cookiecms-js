import knex from '../../inc/knex.js';
import logger from '../../logger.js';

export async function allcapes(req, res) {
    try {
        // Using Knex to query the database
        const capes = await knex('cloaks_lib').select('*');
        
        res.json({ data: capes });
    } catch (error) {
        logger.error('Error getting capes:', error);
        res.status(500).json({ 
            error: true, 
            msg: 'Internal server error', 
            code: 500 
        });
    }
}

export default allcapes;