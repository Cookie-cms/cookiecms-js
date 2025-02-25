import mysql from '../../inc/mysql.js';


export async function allcapes(req, res) {
    let connection;
    try {
        connection = await mysql.getConnection();
        
        const [skin] = await connection.execute(`
            SELECT * FROM cloaks_lib
            `);

        res.json({ error: false, data: skin });

        

    } catch (error) {
        console.error('Error getting skin:', error);
        res.status(500).send('Internal server error');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

export default allcapes;

