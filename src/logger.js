import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { format } from 'winston';

// Загружаем переменные окружения из .env
dotenv.config();

const LOG_DIR = 'info';

// Ensure info directory exists
try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR);
    }
} catch (error) {
    console.error(`Failed to create info directory: ${error.message}`);
    process.exit(1);
}

// Получаем активные уровни логирования из переменных окружения
const logLevelString = process.env.LOG_LEVEL || 'info';
const activeLevels = new Set(logLevelString.split(',').map(level => level.trim()));

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Кастомный фильтр для логов
const logFilter = format((info) => {
    if (activeLevels.has(info.level)) {
        return info;
    }
    return false;
})();

// Создаём логгер
const logger = winston.createLogger({
    levels,
    format: format.combine(
        logFilter,
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
            filename: path.join(LOG_DIR, 'app-%DATE%.info'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: format.combine(
                format.timestamp(),
                format.json()
            )
        })
    ]
});

// Handle uncaught errors
logger.on('error', (error) => {
    console.error('Logger error:', error);
});

export default logger;