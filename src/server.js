import app from './app.js';
import logger from './logger.js';
import knex from './inc/knex.js';

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
    logger.info(`Server is running on port http://localhost:${PORT}`);
});

// === Обработчики завершения процесса ===
const shutdown = () => {
    logger.info('Shutting down server...');
    server.close(() => {
        logger.info('Server closed.');
        knex.destroy().then(() => {
            logger.info('Database connection closed.');
            process.exit(0);
        });
    });
};

process.on('SIGINT', shutdown);  // Ctrl+C
process.on('SIGTERM', shutdown); // Команда `kill`
process.on('exit', shutdown);