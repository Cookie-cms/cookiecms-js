import express from 'express';
import routes from './routes/index.js';
import logger from './logger.js';
import sendHtmlEmail from './inc/mail.js';
import cors from 'cors';
import knex from './inc/knex.js';

const app = express();

app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

export default app;