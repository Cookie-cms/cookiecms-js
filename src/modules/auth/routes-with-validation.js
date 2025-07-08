// Пример использования валидации в роутах auth модуля
import express from 'express';
import { validateRequest } from '../../middleware/validation.js';
import auth from './index.js';

const router = express.Router();

// Маршруты с валидацией

// Авторизация
router.post('/login', 
    validateRequest('sign'), 
    auth.login
);

router.post('/logout', auth.logout);

// Регистрация
router.post('/signup', 
    validateRequest('signup'), 
    auth.signup
);

router.post('/verify-email', 
    validateRequest('confirmMail'), 
    auth.confirmMail
);

router.post('/finish-register', 
    validateRequest('finishRegister'), 
    auth.finishRegister
);

// Восстановление пароля
router.post('/forgot-password', 
    validateRequest('forgetPasswordRequest'), 
    auth.resetPassword
);

router.post('/verify-reset-code', 
    validateRequest('confirmMail'), 
    auth.validate_code_fp
);

router.post('/reset-password', 
    validateRequest('resetPassword'), 
    auth.updatepass
);

// Discord OAuth
router.get('/discord/callback', 
    validateRequest('discordCallback', 'query'), 
    auth.discordCallback
);

router.post('/discord/create', 
    validateRequest('discordCreate'), 
    auth.discordcreate
);

router.post('/discord/link', auth.generateAuthLink);

// Запрос кода подтверждения
router.post('/request-verification', 
    validateRequest('FormMail'), 
    auth.requestVerificationCode
);

export default router;
