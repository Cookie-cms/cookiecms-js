import express from 'express';
import auth from '../modules/auth/index.js';
import rateLimit from 'express-rate-limit'; // добавьте импорт

const router = express.Router();

const resetPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1, // максимум 5 запросов
  message: 'Слишком много попыток сброса пароля, попробуйте позже.'
});

// Auth routes
router.post('/login', auth.login);
router.post('/confirm', auth.confirmMail);
router.post('/logout', auth.logout);
router.post('/register', auth.signup);
router.post('/registerfinish', auth.finishRegister);
router.post('/forgetpass', resetPasswordLimiter, auth.resetPassword);
router.post('/forgetpass/validate', auth.validate_code_fp);
router.post('/forgetpass/update', auth.updatepass);
router.get('/discord/callback', auth.discordCallback);
router.get('/discord/link', auth.generateAuthLink);
router.post('/register/discord', auth.discordcreate);
router.post('/refresh', auth.refreshToken);

export default router;