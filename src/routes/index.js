import express from 'express';
import auth from '../modules/auth/index.js';

const router = express.Router();

router.post('/auth/login', auth.login);

router.post('/auth/confirm', auth.confirmMail);

router.post('/auth/logout', auth.logout);

router.post('/auth/register', auth.signup);

router.post('/auth/registerfinish', auth.finishRegister);



router.get('/home', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/home/edit', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/home/registerfinish', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/admin/users', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/service/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/skin/{uuid}', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/cape/{uuid}', (req, res) => {
    res.send('Welcome to the Express app!');
});



export default router;