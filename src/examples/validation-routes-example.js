// Пример интеграции валидации в основные роуты
import express from 'express';
import { validateRequest } from '../middleware/validation.js';

// Примеры использования middleware валидации в роутах

// 1. В модуле auth/index.js
router.post('/login', validateRequest('sign'), loginController);
router.post('/signup', validateRequest('signup'), signupController);
router.post('/verify', validateRequest('verifyCode'), verifyCodeController);
router.post('/forgot-password', validateRequest('forgetPassword'), forgetPasswordController);
router.post('/reset-password', validateRequest('resetPassword'), resetPasswordController);

// 2. В модуле home/index.js  
router.post('/change-email', validateRequest('changeEmail'), changeEmailController);
router.post('/change-password', validateRequest('changePassword'), changePasswordController);
router.post('/upload-skin', validateRequest('uploadSkin'), uploadSkinController);

// 3. Для валидации параметров URL
router.get('/user/:id', validateRequest('userId', 'params'), getUserController);

// 4. Для валидации query параметров
router.get('/search', validateRequest('searchQuery', 'query'), searchController);

export default router;
