import express from 'express';
import home from '../modules/home/index.js';
import { requireAuth } from '../middleware/auth.js';
import { webSession } from '../middleware/sessiontype.js';

const router = express.Router();

// Home routes (требуют авторизации)
router.get('/', requireAuth, webSession, home.home);
router.put('/edit/username', requireAuth, webSession, home.username);
router.put('/edit/password', requireAuth, webSession, home.editPassword);
router.post('/edit/mail/request', requireAuth, webSession, home.changemail);
router.post('/edit/mail/validate', requireAuth, webSession, home.validatecode);
router.put('/edit/skin', requireAuth, webSession, home.editSkin);
router.post('/edit/skin/select', requireAuth, webSession, home.editSkin);
router.delete('/edit/skin', requireAuth, webSession, home.editSkin);
router.post('/upload', requireAuth, webSession, home.upload);
router.post('/edit/removediscord', requireAuth, webSession, home.removediscordconn);

// Сессии пользователя
router.get('/sessions', requireAuth, webSession, home.getUserSessions);
router.get('/sessions/:sessionId', requireAuth, webSession, home.getSessionInfo);
router.delete('/sessions/:sessionId', requireAuth, webSession, home.terminateSession);
router.delete('/sessions', requireAuth, webSession, home.terminateAllSessions);

export default router;