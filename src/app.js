import express from 'express';
import routes from './routes/index.js';
import logger from './logger.js';
import sendHtmlEmail from './inc/mail.js';
import cors from 'cors';
import knex from './inc/knex.js';
import rateLimit from 'express-rate-limit';

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
app.use(cors({
    credentials: true, // Разрешить отправку cookies
    origin: "http://localhost:3000" // Укажите ваш фронтенд URL
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

export default app;