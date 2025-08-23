import express from 'express';
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
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

router.post('/authorize', gl_authorize);
router.get('/getbyusername', gl_getByUsername);
router.get('/getbyuuid', gl_getByUuid);
router.post('/getbytoken', gl_getByToken);
router.post('/refreshtoken', gl_refreshToken);
router.post('/joinserver', gl_joinServer);
router.post('/checkserver', gl_checkServer);

router.post('/gethardwarebykey', gl_getHardwareByKey);
router.post('/gethardwarebydata', gl_getHardwareByData);
router.post('/createhardware', gl_createHardware);
router.post('/connectuserhardware', gl_connectUserHardware);
router.post('/addpublickey', gl_addPublicKey);
router.post('/gethardwarebyid', gl_getHardwareById);
router.post('/getusersbyhardware', gl_getUsersByHardware);
router.post('/banhardware', gl_banHardware);
router.post('/unbanhardware', gl_unbanHardware);

export default router;