import express from 'express';
import admin from '../modules/admin/index.js';
import { requireAuth } from '../middleware/auth.js';
import { webSession } from '../middleware/sessiontype.js';

const router = express.Router();

// Пользователи
router.get('/users', requireAuth, webSession, admin.users);
router.get('/user/:id', requireAuth, webSession, admin.user);
router.put('/user/:id', requireAuth, admin.userupdate);
router.put('/user/:id/group', requireAuth, admin.updateUserGroup);

router.put('/user/:id/capes', requireAuth, admin.addcape);
router.delete('/user/:id/capes', requireAuth, admin.RemoveCape);


// Капы
router.post('/cape', requireAuth, webSession, admin.uploadCape);
router.delete('/cape', requireAuth, webSession, admin.deleteCape);
router.put('/cape', requireAuth, webSession, admin.updateCape);
router.post('/user/cape/:id', requireAuth, webSession, admin.uploadCape);
router.get('/allcapes', requireAuth, webSession, admin.allcapes);

// Скины
router.get('/skins', requireAuth, webSession, admin.getSkins);

// Метрики
router.get('/metrics', requireAuth, webSession, admin.userRegistrationStats);
router.get('/metrics/users', requireAuth, webSession, admin.allusers);
router.get('/metrics/skins', requireAuth, webSession, admin.skins);

// Аудит
router.get('/audit', requireAuth, webSession, admin.audit);

// Права и роли
router.get('/permissions', requireAuth, admin.getPermissions);
router.post('/permissions', requireAuth, admin.createPermission);
router.put('/permissions/:id', requireAuth, admin.updatePermission);
router.delete('/permissions/:id', requireAuth, admin.deletePermission);

router.get('/roles', requireAuth, admin.getRoles);
router.post('/roles', requireAuth, admin.createRole);
router.put('/roles/:id', requireAuth, admin.updateRole);
router.delete('/roles/:id', requireAuth, admin.deleteRole);
router.post('/roles/:roleId/permissions/:permissionId', requireAuth, admin.assignPermissionToRole);
router.delete('/roles/:roleId/permissions/:permissionId', requireAuth, admin.revokePermissionFromRole);

router.get('/rolepermissions/extended', requireAuth, admin.getExtendedRolePermissions);
router.get('/permission-groups', requireAuth, admin.getPermissionGroups);

router.get('/devices', requireAuth, webSession, admin.getUsersDevices);
router.get('/device/:id', requireAuth, webSession, admin.getUserDevices);
router.post('/devices/:deviceId/ban', requireAuth, webSession, admin.banDevice);
router.post('/devices/:deviceId/unban', requireAuth, webSession, admin.unbanDevice);
router.delete('/devices/:deviceId', requireAuth, webSession, admin.deleteDevice);


export default router;