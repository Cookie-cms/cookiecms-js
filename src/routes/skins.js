import express from 'express';
import skins from '../modules/skins/index.js';

const router = express.Router();

router.get('/gravitlauncher/:uuid', skins.gravitLauncherResponse);
router.get('/head/:uuid', skins.renderHead);
router.get('/body/:uuid', skins.renderBody);
router.get('/cloak/:idcape', skins.renderCloak);
router.get('/standart/:uuid', skins.getSkinFile);
router.get('/standart/cape/:uuid', skins.getCloakFile);
router.get('/public/:uuid', skins.getFileByName);
router.get('/public/cape/:uuid', skins.getFileByName_capes);

export default router;