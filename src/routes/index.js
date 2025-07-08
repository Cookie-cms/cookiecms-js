import express from 'express';
import auth from '../modules/auth/index.js';
import home from '../modules/home/index.js';
import skins from '../modules/skins/index.js';
import admin from '../modules/admin/index.js';
import service from '../modules/service/index.js';
import UsersList from '../modules/public/users.js';
import {
    gl_authorize,
    gl_getByUsername,
    gl_getByUuid,
    gl_getByToken,
    gl_refreshToken,
    gl_joinServer,
    gl_checkServer,
    gl_getHardwareByKey,
    gl_getHardwareByData,
    gl_createHardware,
    gl_connectUserHardware,
    gl_addPublicKey,
    gl_getHardwareById,
    gl_getUsersByHardware,
    gl_banHardware,
    gl_unbanHardware
} from '../modules/service/GravitLauncher.js';
import {userFind} from '../modules/service/UserFind.js';

import {requireAuth} from '../middleware/auth.js';


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

// Home routes (требуют авторизации)
router.get('/home', requireAuth, home.home);
router.put('/home/edit/username', requireAuth, home.username);
router.put('/home/edit/password', requireAuth, home.editPassword);
router.post('/home/edit/mail/request', requireAuth, home.changemail);
router.post('/home/edit/mail/validate', requireAuth, home.validatecode);
router.put('/home/edit/skin', requireAuth, home.editSkin);
router.post('/home/edit/skin/select', requireAuth, home.editSkin);
router.delete('/home/edit/skin', requireAuth, home.editSkin);
router.post('/home/upload', requireAuth, home.upload);
router.post('/home/edit/removediscord', requireAuth, home.removediscordconn);

// Admin routes (требуют авторизации)
router.get('/admin/users', requireAuth, admin.users);
router.get('/admin/user/:id', requireAuth, admin.user);
// router.put('/admin/user/:id', requireAuth, admin.user_udp);

router.post('/admin/cape', requireAuth, admin.uploadCape);
router.delete('/admin/cape', requireAuth, admin.deleteCape);
router.put('/admin/cape', requireAuth, admin.updateCape);

router.get('/admin/audit', requireAuth, admin.audit);
// router.post('/admin/user/role/', requireAuth, admin.user_role);
router.post('/admin/user/cape/:id', requireAuth, admin.uploadCape);
router.get('/admin/allcapes', requireAuth, admin.allcapes);
router.get('/admin/skins', requireAuth, admin.getSkins);

router.get('/admin/metrics', requireAuth, admin.userRegistrationStats);
router.get('/admin/metrics/users', requireAuth, admin.allusers);
router.get('/admin/metrics/skins', requireAuth, admin.skins);

router.get('/admin/permissions', requireAuth, admin.getPermissions);
router.post('/admin/permissions', requireAuth, admin.createPermission);
router.put('/admin/permissions/:id', requireAuth, admin.updatePermission);
router.delete('/admin/permissions/:id', requireAuth, admin.deletePermission);
router.get('/admin/roles', requireAuth, admin.getRoles);
router.post('/admin/roles', requireAuth, admin.createRole);
router.put('/admin/roles/:id', requireAuth, admin.updateRole);
router.delete('/admin/roles/:id', requireAuth, admin.deleteRole);
router.post('/admin/roles/:id/permissions', requireAuth, admin.assignPermissionToRole);
router.delete('/admin/roles/:roleId/permissions/:permissionId', requireAuth, admin.revokePermissionFromRole);

router.get('/admin/rolepermissions/extended', requireAuth, admin.getExtendedRolePermissions);

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

router.get('/service/settings', service.getSettings);
// router.put('/service/settings', service.updateSettings);
router.post('/service/userfind', userFind);

router.post('/gravit/authorize', gl_authorize);
router.get('/gravit/getbyusername', gl_getByUsername);
router.get('/gravit/getbyuuid', gl_getByUuid);
router.post('/gravit/getbytoken', gl_getByToken);
router.post('/gravit/refreshtoken', gl_refreshToken);
router.post('/gravit/joinserver', gl_joinServer);
router.post('/gravit/checkserver', gl_checkServer);

router.post('/gravit/gethardwarebykey', gl_getHardwareByKey);
router.post('/gravit/gethardwarebydata', gl_getHardwareByData);
router.post('/gravit/createhardware', gl_createHardware);
router.post('/gravit/connectuserhardware', gl_connectUserHardware);
router.post('/gravit/addpublickey', gl_addPublicKey);
router.post('/gravit/gethardwarebyid', gl_getHardwareById);
router.post('/gravit/getusersbyhardware', gl_getUsersByHardware);
router.post('/gravit/banhardware', gl_banHardware);
router.post('/gravit/unbanhardware', gl_unbanHardware);

export default router;






