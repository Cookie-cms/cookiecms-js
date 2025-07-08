import { uploadCape, updateCape, deleteCape } from './Cape.js';
import audit from './audit.js';
import users from './users.js';
import {user} from './user.js';
import allcapes from './allcapes.js';
import getSkins from './skins.js';
import {
    getPermissions,
    createPermission,
    updatePermission,
    deletePermission,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionToRole,
    revokePermissionFromRole,
    getExtendedRolePermissions
    } from './role.js';
import { skins, allusers, userRegistrationStats } from './metrics.js';
import { get } from 'http';


export default {
    uploadCape,
    updateCape,
    deleteCape,
    audit,
    users,
    user,
    allcapes,
    getSkins,
    skins,
    allusers,
    userRegistrationStats,
    getPermissions,
    createPermission,
    updatePermission,
    deletePermission,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionToRole,
    revokePermissionFromRole,
    getExtendedRolePermissions
};