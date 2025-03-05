import { uploadCape, updateCape, deleteCape } from './Cape.js';
import audit from './audit.js';
import users from './users.js';
import {user} from './user.js';
import allcapes from './allcapes.js';
import getSkins from './skins.js';
import user_role from './user_role.js';
import user_udp from './user_udp.js';
import { skins, allusers, userRegistrationStats } from './metrics.js';

export default {
    uploadCape,
    updateCape,
    deleteCape,
    audit,
    users,
    user,
    allcapes,
    getSkins,
    user_role,
    user_udp,
    skins,
    allusers,
    userRegistrationStats

};