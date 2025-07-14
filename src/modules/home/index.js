import home from './Home.js';
import upload from './Upload.js';
import username from './Username.js';
import editPassword from './Password.js';
import editSkin from './Skin.js';
import removediscordconn from './discord.js';
import changemail from './Mailsend.js';
import validatecode from './vallidatecode.js';
import { getUserSessions, terminateSession, terminateAllSessions, getSessionInfo } from './Sessions.js';


export default {
    home,
    upload,
    username,
    editPassword,
    editSkin,
    removediscordconn,
    changemail,
    validatecode,
    getUserSessions,
    getSessionInfo,
    terminateSession,
    terminateAllSessions
};