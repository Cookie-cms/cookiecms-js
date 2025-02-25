import express from 'express';
import auth from '../modules/auth/index.js';
import home from '../modules/home/index.js';
import skins from '../modules/skins/index.js';
import admin from '../modules/admin/index.js';
import UsersList from '../modules/public/users.js';
import multer from 'multer';

const router = express.Router();

// Public routes
router.get('/pub/list', UsersList);


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
router.post('/auth/register/discord', auth.discordcreate);

// Home routes
router.get('/home', home.home);
router.put('/home/edit/username', home.username);
router.put('/home/edit/password', home.editPassword);
router.post('/home/edit/mail/request', home.changemail);
router.post('/home/edit/mail/validate', home.validatecode);
router.put('/home/edit/skin', home.editSkin);
router.post('/home/edit/skin/select', home.editSkin);
router.delete('/home/edit/skin', home.editSkin);
router.post('/home/upload', home.upload);
router.post('/home/edit/removediscord', home.removediscordconn);

// Admin routes
router.get('/admin/users', admin.users);
router.get('/admin/user/:id', admin.user);

router.post('/admin/cape', admin.uploadCape);
router.delete('/admin/cape', admin.deleteCape);
router.put('/admin/cape', admin.updateCape);

router.get('/admin/audit', admin.audit);





router.get('/admin/allcapes', admin.allcapes);
router.get('/admin/skins', admin.getSkins);

router.post('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.post('/admin/mail', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.post('/admin/user/role/:id', (req, res) => {
    res.send('Welcome to the Express app!');
});
router.post('/admin/user/cape/:id', (req, res) => {
    res.send('Welcome to the Express app!');
});



// Skins routes
router.get('/skin/gravitlauncher/:uuid', skins.gravitLauncherResponse);


router.get('/skin/head/:uuid', skins.renderHead);

router.get('/skin/body/:uuid', skins.renderBody);

router.get('/skin/cloak/:idcape', skins.renderCloak);

router.get('/skin/standart/:uuid', skins.getSkinFile);

router.get('/skin/standart/cape/:uuid', skins.getCloakFile);

router.get('/skin/public/:uuid', skins.getFileByName);

router.get('/skin/public/cape/:uuid', skins.getFileByName_capes);


// Service routes
router.post('/service/user', (req, res) => {
    res.send('Welcome to the Express app!');
});


export default router;