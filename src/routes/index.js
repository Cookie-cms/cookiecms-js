import express from 'express';
import authRoutes from './auth.js';
import homeRoutes from './home.js';
import adminRoutes from './admin.js';
import skinsRoutes from './skins.js';
import gravitRoutes from './gravit.js';
import UsersList from '../modules/public/users.js';
import { userFind } from '../modules/service/UserFind.js';

const router = express.Router();

// Public
router.get('/pub/list', UsersList);

// Auth
router.use('/auth', authRoutes);

// Home
router.use('/home', homeRoutes);

// Admin
router.use('/admin', adminRoutes);

// Skins
router.use('/skin', skinsRoutes);

// GravitLauncher
router.use('/gravit', gravitRoutes);

// Service
router.post('/service/userfind', userFind);

export default router;