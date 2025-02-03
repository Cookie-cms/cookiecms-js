import express from 'express';
import auth from '../modules/auth/index.js';
import home from '../modules/home/index.js';
import Client from 'discord-oauth2-api';
import multer from 'multer';

const router = express.Router();
const uploadMulter = multer({ dest: 'uploads/' });


// Auth
router.post('/auth/login', auth.login);

router.post('/auth/confirm', auth.confirmMail);

router.post('/auth/logout', auth.logout);

router.post('/auth/register', auth.signup);

router.post('/auth/registerfinish', auth.finishRegister);

router.post('/auth/forgetpass', auth.resetPassword);
router.post('/auth/forgetpass/validate', auth.validate_code_fp);
router.post('/auth/forgetpass/update', auth.updatepass);

router.get('/auth/discord/callback', auth.discordCallback);
router.get('/auth/discord/link', auth.generateAuthLink);

// router.get('/auth/singindiscord', auth.SigninDiscord);
// router.get('/auth/singupdiscord', auth.SingupDiscord);


// Home
router.get('/home',  home.home);

router.put('/home/edit/username', home.edit);

router.put('/home/edit/password', home.edit);

router.post('/home/edit/mail/request', home.edit);

router.post('/home/edit/mail/validate', home.edit);

router.put('/home/edit/skin', home.edit);

router.delete('/home/edit/skin', home.edit);

router.post('/home/upload', uploadMulter.single('file'), home.upload);

// Admin
router.get('/admin/users', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});


// Service
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