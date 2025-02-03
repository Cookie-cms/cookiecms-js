import express from 'express';
import auth from '../modules/auth/index.js';
import home from '../modules/home/index.js';
import multer from 'multer';

const router = express.Router();
const uploadMulter = multer({ dest: 'uploads/' }); // укажи нужную папку

// Auth routes
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

// Home routes
router.get('/home', home.home);
router.put('/home/edit/username', home.username);
router.put('/home/edit/password', home.editPassword);
router.post('/home/edit/mail/request', home.requestMailCode);
router.post('/home/edit/mail/validate', home.validateMailCode);
router.put('/home/edit/skin', home.editSkin);
router.delete('/home/edit/skin', home.editSkin);
router.post('/home/upload', uploadMulter.single('file'), home.upload);

// Admin routes
router.get('/admin/users', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.get('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.post('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

// Service routes
router.get('/service/user', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.get('/skin/:uuid', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.get('/cape/:uuid', (req, res) => {
    res.send('Welcome to the Express app!');
});

export default router;