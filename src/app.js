import express from 'express';
import routes from './routes/index.js';
import logger from './logger.js';
import sendHtmlEmail from './inc/mail.js';
import cors from 'cors';
import knex from './inc/knex.js';
import rateLimit from 'express-rate-limit';
import { startCronScheduler } from './cron/scheduler.js';

const app = express();

// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"]
//     }
//   }
// }));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов, попробуйте позже.'
});
startCronScheduler();
app.use(cors({
    credentials: true, // Разрешить отправку cookies
    origin: "http://localhost:3000" // Укажите ваш фронтенд URL
}));
app.use(apiLimiter); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

export default app;