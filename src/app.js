import express from 'express';
import routes from './routes/index.js';
import logger from './logger.js';
import mysql from './inc/mysql.js';
import cors from 'cors';
import createResponse from './inc/_reponse.js';

export default {
    createResponse
}

const app = express();

mysql.getConnection((err, connection) => {
    if (err) {
        logger.error('Error connecting to MySQL:', err);
    } else {
        logger.info('MySQL connection established successfully');
        connection.release();
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.on('finish', () => {
        let { ip, method, originalUrl, httpVersion } = req;
        const status = res.statusCode;
        const statusMessage = res.statusMessage || getDefaultStatusMessage(status);

        ip = ip.replace(/^::ffff:/, '');

        const logMessage = `${ip} - "${method} ${originalUrl} HTTP/${httpVersion}" ${status} ${statusMessage}`;
        logger.info(logMessage);
    });
    next();
});

app.use('/api', routes);

app.use(cors());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port http://localhost:${PORT}`);
});